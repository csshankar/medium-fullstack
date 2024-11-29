import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { signinInput, signupInput } from "@100xdevs/medium-common"

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>();

userRouter.post('/signup', async (c) => {

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
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
    datasourceUrl: c.env.DATABASE_URL,
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

    return c.json({ jwt });
  }
  catch (e) {

    console.error(e); // Log the error for debugging
    c.status(411);
    return c.json({
      message: "Internal server error",
    })
  }
})
