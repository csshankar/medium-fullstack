import { PrismaClient, User } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@100xdevs/medium-common";



export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: number;
  }
}>();

blogRouter.use('/*', async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  try {
    const user = await verify(authHeader, c.env.JWT_SECRET) as User || null;
    console.log(user)

    if (user) {
      c.set("userId", user.id);
      await next()
    } else {
      c.status(403)
      return c.json({ error: "unauthorized" })
    }
  } catch (error) {
    c.status(403);
    return c.json({ error: "You are not logged in" });
  }
});


blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct"
    })
  }
  const userId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());


  try {
    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId

      }
    })
    return c.json({
      id: blog.id
    })

  } catch (e) { }
  return c.text('Blog not created!')
})








blogRouter.put('/', async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct"
    })
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = prisma.blog.update({
      where: {
        id: body.id
      },
      data: {
        title: body.title,
        content: body.content
      }
    })
    return c.json({
      id: (await blog).id
    })
  } catch (e) {
    return c.json({ message: "blogs not updated" })
  }
})






blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    //pagination
    const posts = await prisma.blog.findMany({
      select: {
        content: true,
        title: true,
        id: true,
        author: {
          select: { name: true }
        }
      }
    });
    if (!posts || posts.length === 0) {
      c.status(404);
      return c.json({ message: "No posts found" });
    }
    console.log(posts);
    return c.json({ posts });
  } catch (e) {
    console.error("Error fetching posts:", e);
    return c.json({ e: 'not found' })
  }
})
blogRouter.get('/:id', async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    c.status(400)
    return c.json({ error: "Invalid ID" });
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        id: id
      }, select: {
        title: true,
        content: true,
        author: {
          select: {
            name: true
          }
        }
      }
    })
    return c.json({ blog });
  } catch (e) { }
  c.status(411);
  return c.json({ message: "Blog not found" })
})
