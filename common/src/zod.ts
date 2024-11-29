import z from "zod"

export const singupInput = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name:z.string().optional()
})

export type singupInput =z.infer<typeof singupInput>



export const singinInput = z.object({
    email: z.string().email(),
    password: z.string().min(8)
})

export type singinInput =z.infer<typeof singupInput>


export const createBlogInput =z.object({
    title:z.string(),
    content: z.string()
})

export type CreateBlogInput =z.infer<typeof createBlogInput>

export const updateBlogInput =z.object({
    title: z.string(),
    content: z.string(),
    id: z.number()
})

export type updateBlogInput =z.infer<typeof updateBlogInput>



