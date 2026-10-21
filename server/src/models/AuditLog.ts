import { Schema,model } from 'mongoose';
const schema=new Schema({actor:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},action:{type:String,required:true,index:true},targetType:{type:String,required:true,index:true},targetId:{type:String,required:true},summary:{type:String,required:true,maxlength:500},details:{type:Schema.Types.Mixed,default:null}},{timestamps:true});
schema.index({createdAt:-1});
export const AuditLog=model('AuditLog',schema);
