import {Router,type Request,type Response,type NextFunction} from 'express';
import {z} from 'zod';
import {authenticate} from '../../middleware/auth.js';
import {Notification} from '../../models/Notification.js';
export const notificationsRouter=Router();
const asyncRoute=(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{void fn(req,res,next).catch(next)};
notificationsRouter.get('/',authenticate,asyncRoute(async(req,res)=>{const notifications=await Notification.find({user:req.auth!.userId}).sort({createdAt:-1}).limit(100).lean();const unread=await Notification.countDocuments({user:req.auth!.userId,readAt:null});res.json({notifications,unread})}));
notificationsRouter.post('/:id/read',authenticate,asyncRoute(async(req,res)=>{const id=z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);const item=await Notification.findOneAndUpdate({_id:id,user:req.auth!.userId},{readAt:new Date()},{new:true});if(!item)return res.status(404).json({message:'Không tìm thấy thông báo.'});res.json({notification:item})}));
notificationsRouter.post('/read-all',authenticate,asyncRoute(async(req,res)=>{await Notification.updateMany({user:req.auth!.userId,readAt:null},{readAt:new Date()});res.json({message:'Đã đánh dấu đã đọc.'})}));
