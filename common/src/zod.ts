import z from "zod"

export const signupInput = z.object({
    username: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional()
})

export type SignupInput = z.infer<typeof signupInput>



export const signinInput = z.object({
    username: z.string().email(),
    password: z.string().min(8)
})

export type SigninInput = z.infer<typeof signinInput>


export const createBlogInput = z.object({
    title: z.string(),
    content: z.string(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    categoryId: z.number().optional()
})

export type CreateBlogInput = z.infer<typeof createBlogInput>

export const updateBlogInput = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    categoryId: z.number().optional(),
    id: z.number()
})

export type updateBlogInput =z.infer<typeof updateBlogInput>



