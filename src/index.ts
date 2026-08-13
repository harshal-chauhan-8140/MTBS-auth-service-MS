const user={name:"Harshal",age:25,email:"harshal@example.com",roles:["admin","user"]}

function greetUser(user:{name:string,age:number,email:string,roles:string[]}){const message=`Hello ${user.name}! You are ${user.age} years old.`;console.log(message);return {success:true,user, message}}

const users=[{name:"Harshal",age:25,email:"harshal@example.com",roles:["admin","user"]},{name:"John",age:30,email:"john@example.com",roles:["user"]}]

users.forEach(user=>{if(user.roles.includes("admin")){console.log(`${user.name} is an admin`)}})
     
greetUser(user)