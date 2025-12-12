import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth";
import { z } from "zod";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/env";
import {
  rateLimit,
  createRateLimitResponse,
  getRateLimitConfig,
  resetRateLimit,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Apply rate limiting (strict: 5 attempts per 15 minutes per IP+email)
    const rateLimitConfig = getRateLimitConfig("STRICT", validatedData.email);
    const rateLimitResult = await rateLimit(request, rateLimitConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Authenticate user
    // Always perform authentication check to prevent timing attacks
    // Use consistent timing regardless of whether user exists
    const user = await authenticateUser(
      validatedData.email,
      validatedData.password
    );

    if (!user) {
      // Don't reset rate limit on failed authentication
      // This allows rate limiting to work for brute force protection
      // Generic error message prevents account enumeration
      return NextResponse.json(
        { error: "Invalid email or password" },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Reset rate limit on successful authentication
    await resetRateLimit(request, validatedData.email);

    // Create JWT token
    const jwtSecret = getJwtSecret();
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(jwtSecret);

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Add rate limit headers (limit was reset, so show full limit)
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.limit.toString()
    );
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    // Log detailed error for debugging
    console.error("Login error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check if it's a database connection error
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("Access denied") ||
      errorMessage.includes("Unknown database")
    ) {
      console.error("Database connection error details:", {
        message: errorMessage,
        stack: errorStack,
      });
      return NextResponse.json(
        {
          error: "Database connection failed",
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to authenticate",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
