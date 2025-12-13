import db from "../config/firebase";
import { User } from "../types/user.type";

export class UserService {
  static async createUser(user: User) {
    await db.collection("users").doc().set({...user});
    return user;
  }

  static async getUser(id: string) {
    const userDoc = await db.collection("users").doc(id).get();
    return userDoc.exists ? userDoc.data() : null;
  }
}
