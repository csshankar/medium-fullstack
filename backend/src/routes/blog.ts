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

blogRouter.get('/categories', async (c) => {
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const categories = await prisma.category.findMany();
  return c.json({ categories });
})

blogRouter.get('/archives', async (c) => {
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const dates = await prisma.blog.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const archivesMap: Record<number, number[]> = {};
    dates.forEach(d => {
      const year = d.createdAt.getFullYear();
      const month = d.createdAt.getMonth() + 1;
      if (!archivesMap[year]) {
        archivesMap[year] = [];
      }
      if (!archivesMap[year].includes(month)) {
        archivesMap[year].push(month);
      }
    });
    return c.json({ archives: archivesMap });
  } catch (e) {
    return c.json({ error: "Failed to load archives" }, 500);
  }
})

blogRouter.use('/*', async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  console.log("Authorization Header:", authHeader); // Log the auth header for debugging

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const user = await verify(token, c.env.JWT_SECRET, 'HS256') as User | null;
    console.log("Where are the horses: " + c.env.JWT_SECRET);

    
    console.log("Authenticated User:", user); // Log the user for debugging

    if (user) {
      c.set("userId", user.id);
      await next()
    } else {
      c.status(403)
      return c.json({ error: "unauthorized" })
    }
  } catch (error) {
    console.error("Verification Error:", error); // Log the error for debugging
    c.status(403);
    return c.json({ error: "You are not logged in" });
  }
});


blogRouter.post('/like', async (c) => {
  const body = await c.req.json();
  const userId = c.get("userId");
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_blogId: {
          userId,
          blogId: body.blogId
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
      return c.json({ message: "Unliked" });
    } else {
      await prisma.like.create({
        data: {
          userId,
          blogId: body.blogId
        }
      });
      return c.json({ message: "Liked" });
    }
  } catch (e) {
    return c.json({ message: "Error" }, 500);
  }
})

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
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());


  try {
    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        description: body.description,
        thumbnail: body.thumbnail,
        categoryId: body.categoryId || null,
        authorId: userId

      }
    })
    return c.json({
      id: blog.id
    })

  } catch (e) {
    console.error(e);
    c.status(500);
    return c.json({ message: "Internal server error while creating blog" })
  }
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
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = prisma.blog.update({
      where: {
        id: body.id
      },
      data: {
        title: body.title,
        content: body.content,
        description: body.description,
        thumbnail: body.thumbnail,
        categoryId: body.categoryId
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
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const categoryId = c.req.query('categoryId');
    const searchQuery = c.req.query('search');
    const year = c.req.query('year');
    const month = c.req.query('month');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { content: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }

    if (year) {
      const parsedYear = Number(year);
      let startDate = new Date(parsedYear, 0, 1);
      let endDate = new Date(parsedYear + 1, 0, 1);

      if (month) {
        const parsedMonth = Number(month) - 1; // 0-indexed in JS Date
        startDate = new Date(parsedYear, parsedMonth, 1);
        endDate = new Date(parsedYear, parsedMonth + 1, 1);
      }

      where.createdAt = {
        gte: startDate,
        lt: endDate
      };
    }

    const blogs = await prisma.blog.findMany({
      where,
      select: {
        content: true,  
        title: true,
        id: true,
        description: true,
        thumbnail: true,
        createdAt: true,
        _count: {
          select: { likes: true }
        },
        category: true,
        author: {
          select: { 
            name: true 
          }
        }
      },
      take: limit,
      skip: skip,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalBlogs = await prisma.blog.count({ where });
    
    return c.json({
      blogs,
      total: totalBlogs,
      page,
      limit,
      totalPages: Math.ceil(totalBlogs / limit)
    })
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
  const userId = c.get("userId");
  const prisma = new PrismaClient({
    accelerateUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        id: id
      }, select: {
        id: true,
        title: true,
        content: true,
        description: true,
        thumbnail: true,
        createdAt: true,
        _count: {
          select: { likes: true }
        },
        likes: {
          where: {
            userId: userId
          }
        },
        category: true,
        author: {
          select: {
            name: true
          }
        }
      }
    })

    if (blog) {
      // @ts-ignore
      blog.isLiked = blog.likes.length > 0;
      // @ts-ignore
      delete blog.likes;
    }

    return c.json({ blog });
  } catch (e) { }
  c.status(411);
  return c.json({ message: "Blog not found" })
})
