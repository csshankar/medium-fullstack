import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { signinInput, signupInput } from "@100xdevs/medium-common"

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>();

// Secure native Web Crypto hashing function for Cloudflare Workers
async function hashPassword(password: string, username: string): Promise<string> {
  const encoder = new TextEncoder();
  // Salt the password with the unique username to protect against rainbow table attacks
  const data = encoder.encode(password + ":" + username);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

userRouter.get('/me', async (c) => {
  const authHeader = c.req.header("authorization") || "";
  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    const prisma = new PrismaClient({
      accelerateUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const user = await prisma.user.findUnique({
      where: {
        id: Number(payload.id)
      },
      select: {
        id: true,
        username: true,
        name: true
      }
    });

    if (!user) {
      c.status(404);
      return c.json({ message: "User not found" });
    }

    return c.json({ user });
  } catch (e) {
    c.status(403);
    return c.json({ message: "Not logged in" });
  }
});

userRouter.post('/signup', async (c) => {
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);

  try {
    if (!success) {
      c.status(411);
      return c.json({
        message: "Input is not correct",
      });
    }

    const hashedPassword = await hashPassword(body.password, body.username);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: hashedPassword,
        name: body.name,
      }
    })

    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(token)
  }
  catch (e) {
    console.error(e);
    c.status(411);
    return c.json({
      message: "Internal server error",
    })
  }
})

userRouter.post('/signin', async (c) => {
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
  try {
    if (!success) {
      c.status(411);
      return c.json({
        message: "Inputs are not correct"
      })
    }

    const hashedPassword = await hashPassword(body.password, body.username);
    const user = await prisma.user.findUnique({
      where: {
        username: body.username,
        password: hashedPassword,
      }
    })

    if (!user) {
      c.status(403);
      return c.text('email/password is wrong')
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(jwt);
  }
  catch (e) {
    console.error(e);
    c.status(411);
    return c.json({
      message: "Internal server error",
    })
  }
})
