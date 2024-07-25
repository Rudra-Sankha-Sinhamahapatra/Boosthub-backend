import express from "express";
import jwt from "jsonwebtoken";
import zod, { date } from "zod";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middleware";

export const Userapp = express.Router();

const signupBody = zod.object({
  email: zod.string().email(),
  password: zod.string().min(5),
  name: zod.string().optional(),
  role: zod.string(),
});

Userapp.post("/signup", async (req, res) => {
  const { success } = signupBody.safeParse(req.body);
  console.log(success)

  if (!success) {
    return res.status(401).json({
      message: "Incorrect Inputs",
    });
  }

  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;
  const role = req.body.role;

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (existingUser) {
    return res.status(403).json({
      message: "User Already Exists",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        name: name,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret");
   
    res.status(200).cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      maxAge: 15 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      path: '/'
    }).json({
      token: token,
      message: "User Created Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Some error happened",
      error: error,
    });
  }
});

const signInBody = zod.object({
  email: zod.string().email(),
  password: zod.string().min(5),
});


console.log(`${process.env.NODE_ENV}`)

Userapp.post("/login", async (req, res) => {
  const { success } = signInBody.safeParse(req.body);

  if (!success) {
    return res.status(401).json({
      message: "Incorrect Inputs",
    });
  }

  const email = req.body.email;
  const password = req.body.password;

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    console.log(`${existingUser?.email}`);

    if (!existingUser) {
      return res.status(403).json({
        message: "User dosen't exist",
      });
    }

    const validPassword = await bcrypt.compare(password, existingUser.password);
    if (!validPassword) {
      return res.status(403).json({
        message: "Incorrect Password",
      });
    }

    const token = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET || "secret");

    console.log(`${token}`)

     res.status(200).cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      maxAge: 15 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      path: '/'
    })
    .json({
      token: token,
      message: "Sign In Successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Some Error Happened",
      error: error,
    });
  }
});


Userapp.post("/logout", authMiddleware, async (req: any, res) => {
  const userId = req.user.id;
  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User dosent exists"
      })
    }

    res.clearCookie("token");

    return res.status(200).json({
      message: "Logged out Successfully"
    })

  }
  catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error
    })
  }
})

Userapp.get("/me", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      message: "Token not present",
    });
  }

  try {
    const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    if (!decodedToken || !decodedToken.id) {
      return res.status(403).json({
        message: "Invalid Token",
      });
    }
    const userId = decodedToken.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    if (!user.name) {
      user.name = "Anonymous";
    }

    return res.status(200).json({
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: {
        date: user.createdAt.toLocaleDateString(),
        time: user.createdAt.toLocaleTimeString(),
      },
      updatedAt: {
        date: user.updatedAt.toLocaleDateString(),
        time: user.updatedAt.toLocaleTimeString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

const updateBody = zod.object({
  email: zod.string().email(),
  newemail: zod.string().email().optional(),
  password: zod.string().min(5).optional(),
  name: zod.string().min(1).optional(),
  role: zod.string().optional()
})

Userapp.put('/update', authMiddleware, async (req, res) => {
  const { success } = updateBody.safeParse(req.body);

  if (!success) {
    return res.status(401).json({
      message: "Incorrect Inputs"
    });
  }

  const email = req.body.email;
  const newmail = req.body.newmail;
  const password = req.body.password;
  const name = req.body.name;
  const role = req.body.role;

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User dosen't exists"
      })
    }

    const updateData: any = {};
    if (newmail) updateData.email = newmail;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    updateData.updatedAt = new Date();

    const user = await prisma.user.update({
      where: {
        email: email
      },
      data: updateData,
    })

    return res.status(200).json({
      message: "Updated Data Sucessfully",
      user: user,
    });

  }
  catch (error) {
    res.status(500).json({
      message: "Internal Server error,or user dosent exists",
      error: error
    })
  }
})

Userapp.get('/courses', authMiddleware, async (req: any, res: any) => {
  try {
    const courses = await prisma.course.findMany({
      where: { teacherId: req.user.id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        teacherId: true,
        teacher: {
          select: {
            name: true,
            role: true
          }
        },
        updatedAt: true,
        createdAt: true
      }
    });


    return res.status(200).json({
      courses: courses
    })
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error
    })
  }
})