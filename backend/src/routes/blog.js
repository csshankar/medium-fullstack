import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@instructiveagonizing/medium-common";
export const blogRouter = new Hono();
blogRouter.use('/*', async (c, next) => {
    const authHeader = c.req.header("authorization") || "";
    console.log("Authorization Header:", authHeader); // Log the auth header for debugging
    try {
        const token = authHeader.replace("Bearer ", "").trim();
        const user = await verify(token, c.env.JWT_SECRET, 'HS256');
        console.log("Where are the horses: " + c.env.JWT_SECRET);
        console.log("Authenticated User:", user); // Log the user for debugging
        if (user) {
            c.set("userId", user.id);
            await next();
        }
        else {
            c.status(403);
            return c.json({ error: "unauthorized" });
        }
    }
    catch (error) {
        console.error("Verification Error:", error); // Log the error for debugging
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
        });
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
                description: body.description,
                thumbnail: body.thumbnail,
                authorId: userId
            }
        });
        return c.json({
            id: blog.id
        });
    }
    catch (e) { }
    return c.text('Blog not created!');
});
blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        });
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
                content: body.content,
                description: body.description,
                thumbnail: body.thumbnail
            }
        });
        return c.json({
            id: (await blog).id
        });
    }
    catch (e) {
        return c.json({ message: "blogs not updated" });
    }
});
blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    try {
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        const skip = (page - 1) * limit;
        const blogs = await prisma.blog.findMany({
            select: {
                content: true,
                title: true,
                id: true,
                description: true,
                thumbnail: true,
                createdAt: true,
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
        const totalBlogs = await prisma.blog.count();
        return c.json({
            blogs,
            total: totalBlogs,
            page,
            limit,
            totalPages: Math.ceil(totalBlogs / limit)
        });
    }
    catch (e) {
        console.error("Error fetching posts:", e);
        return c.json({ e: 'not found' });
    }
});
blogRouter.get('/:id', async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
        c.status(400);
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
                id: true,
                title: true,
                content: true,
                description: true,
                thumbnail: true,
                createdAt: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        });
        return c.json({ blog });
    }
    catch (e) { }
    c.status(411);
    return c.json({ message: "Blog not found" });
});
