import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { DefectTicket } from '../../models/DefectTicket.js';
import { WorkRequest } from '../../models/Request.js';
import { Schedule } from '../../models/Schedule.js';
import { ShiftSymbol } from '../../models/ShiftSymbol.js';
import { User } from '../../models/User.js';
import { Employee } from '../../models/Employee.js';

export const dashboardRouter=Router();
const asyncRoute=(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{void fn(req,res,next).catch(next)};
const monthNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date());
const dateKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
dashboardRouter.get('/',authenticate,asyncRoute(async(req,res)=>{
 const today=dateKey(new Date()), month=monthNow(), now=new Date();
 const user=await User.findById(req.auth!.userId).select('employee'); const employeeId=user?.employee;
 const [open,overdue,acceptance,pending, schedule, symbols, myTickets, myRequests]=await Promise.all([
  DefectTicket.countDocuments({status:{$nin:['closed','cancelled']}}),DefectTicket.countDocuments({status:{$nin:['closed','cancelled']},dueAt:{$lt:now}}),DefectTicket.countDocuments({status:'awaiting_acceptance'}),WorkRequest.countDocuments({status:'pending'}),Schedule.findOne({month,status:'published'}).populate('entries.cells.symbol').populate('entries.employee','fullName title team').populate('leaders.employee','fullName').lean(),ShiftSymbol.find({active:true}).lean(),employeeId?DefectTicket.find({$or:[{assignee:req.auth!.userId},{collaborators:req.auth!.userId}],status:{$nin:['closed','cancelled']}}).populate('equipment','name').sort({dueAt:1}).limit(8).lean():Promise.resolve([]),WorkRequest.find(req.auth!.role==='admin'||req.auth!.role==='manager'?{status:'pending'}:{requester:req.auth!.userId}).sort({createdAt:-1}).limit(8).lean()
 ]);
 const day=Number(today.slice(-2)); const shiftMap=new Map(symbols.map(s=>[String(s._id),s]));
 const roster={SB2:[] as string[],SB4:[] as string[],leaders:[] as string[]};
 if(schedule){for(const entry of schedule.entries){const cell=entry.cells.find(c=>c.day===day);const symbol=cell?.symbol as unknown as {_id:unknown}|undefined;const shift=symbol&&shiftMap.get(String(symbol._id));const person=entry.employee as unknown as {fullName:string};if(shift?.plantKey==='SB2')roster.SB2.push(person.fullName);if(shift?.plantKey==='SB4')roster.SB4.push(person.fullName)}for(const item of schedule.leaders.filter(x=>x.day===day))roster.leaders.push((item.employee as unknown as {fullName:string}).fullName)}
 const myShifts:any[]=[];if(schedule&&employeeId){const e=schedule.entries.find(row=>String((row.employee as unknown as {_id:unknown})._id)===String(employeeId));for(let i=0;i<7;i++){const date=new Date(now.getTime()+i*86400000);const key=dateKey(date);if(key.slice(0,7)!==month)continue;const cell=e?.cells.find(c=>c.day===Number(key.slice(-2)));const sym=cell?.symbol as unknown as {_id:unknown;name:string}|undefined;myShifts.push({date:key,symbol:sym?.name||''})}}
 const byPlant=await DefectTicket.aggregate([{ $match:{detectedAt:{$gte:new Date(`${month}-01T00:00:00+07:00`)}}},{$lookup:{from:'plants',localField:'plant',foreignField:'_id',as:'plant'}},{$unwind:'$plant'},{$group:{_id:'$plant.code',count:{$sum:1}}}]);
 res.json({month,today,stats:{open,overdue,acceptance,pending},roster,myTickets,myRequests,myShifts,defectsByPlant:byPlant});
}));
