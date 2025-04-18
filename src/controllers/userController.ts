import { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/db';
import { Request, Response } from 'express';

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const updatedData = req.body;
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new Error("User doesn't exist");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
    });
    console.log(updatedUser);
    res.status(200).json({
      message: 'Your profile updated successfully!',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error(error?.message);
    res.status(400).json({ error: error.message });
  }
};

export const logout = async (_: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteAccount = async (req: Request & { user?: { id: string } }, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new Error("User doesn't exist");
    }
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
    res.status(200).json({ success: true, message: 'Account deleted successfully!' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error?.message,
    });
  }
};
