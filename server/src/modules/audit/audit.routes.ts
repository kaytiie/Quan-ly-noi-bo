import {Router,type Request,type Response,type NextFunction} from 'express';
import {authenticate,allowRoles} from '../../middleware/auth.js';
import {AuditLog} from '../../models/AuditLog.js';
export const auditRouter=Router();
const asyncRoute=(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{void fn(req,res,next).catch(next)};
auditRouter.get('/',authenticate,allowRoles('admin'),asyncRoute(async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1);const logs=await AuditLog.find().populate('actor','email role').sort({createdAt:-1}).skip((page-1)*50).limit(50).lean();res.json({logs,page})}));
