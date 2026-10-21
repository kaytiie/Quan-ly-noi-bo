import { Schema,model } from 'mongoose';
const schema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,required:true,maxlength:160},message:{type:String,required:true,maxlength:500},link:{type:String,default:'/'},readAt:{type:Date,default:null,index:true}},{timestamps:true});
schema.index({user:1,readAt:1,createdAt:-1});
export const Notification=model('Notification',schema);
