import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/auth";
import { z } from "zod";
import {
  rateLimit,
  createRateLimitResponse,
  getRateLimitConfig,
} from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Apply rate limiting (moderate: 10 attempts per 15 minutes per IP)
    const rateLimitConfig = getRateLimitConfig("MODERATE");
    const rateLimitResult = await rateLimit(request, rateLimitConfig);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Check if user already exists
    // Use same error message as login to prevent account enumeration
    const existingUser = await findUserByEmail(validatedData.email);
    if (existingUser) {
      // Generic error message - same as login to prevent account enumeration
      return NextResponse.json(
        { error: "Invalid email or password" },
        {
          status: 401, // Use 401 to match login error status
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Create user
    const user = await createUser(
      validatedData.email,
      validatedData.password,
      validatedData.name
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // Add rate limit headers to successful response
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
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
    console.error("Registration error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check if it's a database connection error
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("Access denied") ||
      errorMessage.includes("Unknown database") ||
      errorMessage.includes("does not support secure connection")
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
        error: "Failed to create user",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
