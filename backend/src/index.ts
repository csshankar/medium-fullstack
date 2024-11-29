import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { cors } from 'hono/cors'


const app = new Hono<{
	Bindings: {
		DATABASE_URL: string
    JWT_SECRET:string
	}
}>();
const corsOptions = {
	origin: '*',  // Allow all origins (or set this to specific domains for more control)
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Explicitly allow OPTIONS method
	allowedHeaders: ['Content-Type', 'Authorization']  // Specify which headers are allowed
  };
app.use('/*', cors(corsOptions))
app.options('/*', cors());

app.route("/api/v1/user",userRouter);
app.route("/api/v1/blog",blogRouter)




export default app
