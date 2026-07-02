import { Hono } from 'hono';
import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { cors } from 'hono/cors';
const app = new Hono();
// const corsOptions = {
// 	origin: '*',  // Allow all origins (or set this to specific domains for more control)
// 	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Explicitly allow OPTIONS method
// 	allowedHeaders: ['Content-Type', 'Authorization']  // Specify which headers are allowed
//   };
// app.use('/*', cors(corsOptions))
app.use('/*', cors());
app.route("/api/v1/user", userRouter);
app.route("/api/v1/blog", blogRouter);
export default app;
