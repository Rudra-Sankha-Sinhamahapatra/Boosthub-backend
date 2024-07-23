import { Request,Response,NextFunction } from "express";
import { JWT_SECRET } from "./conf";
import jwt from 'jsonwebtoken'

export const authMiddleware=(req:any,res:Response,next:NextFunction)=>{
const token=req.cookies.token;

if(!token){
    return res.status(404).json({
        message:"No token found,You are signed out"
    })
}

try{
 const decodedToken:any=jwt.verify(token,JWT_SECRET);
 if(!decodedToken || !decodedToken.id){
    return res.status(401).json({
        message:"Token not verified,Please login again"
    })
 }

 
 req.user=decodedToken;
 next();
}
catch(error){
    return res.status(500).json({
        message:"Internal Server Error or You are logged out",
        error:error
    })
}
}