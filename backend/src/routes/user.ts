import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { signinInput, signupInput } from "@instructiveagonizing/medium-common"

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>();

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
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      }
    })

    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.text(
      token
    )
  }
  catch (e) {

    console.error(e); // Log the error for debugging
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
    const user = await prisma.user.findUnique({
      where: {
        username: body.username,
        password: body.password,
      }
    })

    if (!user) {
      c.status(403);
      return c.text('email/password is wrong')
    }
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    console.log("Where are the horses: " + c.env.JWT_SECRET);
    console.log(jwt);
    return c.json(jwt );

  }
  catch (e) {

    console.error(e); // Log the error for debugging
    c.status(411);
    return c.json({
      message: "Internal server error",
    })
  }
})
