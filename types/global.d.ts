import { Types } from 'mongoose';

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CONNECTION_URL: string;
      SESSION_SECRET: string;
      PORT?: string;
    }
  }

  namespace Express {
    interface User {
      username: string;
      _id: Types.ObjectId;
    }
  }

  interface ResponseError extends Error {
    status?: number;
  }

  interface BlogPost {
    _id: Types.ObjectId;
    date_created: Date | string;
    title: string;
    slug: string;
    author: Types.ObjectId; // user id
    content: string;
    comments?: Comment[];
    liked_by?: Types.ObjectId[]; // user ids
    tags?: Types.ObjectId[]; // tag ids
    edits?: {
      date_created: Date | string;
    }[];
  }

  interface Comment {
    _id: Types.ObjectId;
    date_created: Date | string;
    author: Types.ObjectId;
    content: string;
    comment_level: number;
    parent_comment_id?: Types.ObjectId;
    liked_by: Types.ObjectId[]; // user ids
  }

  interface User {
    _id: Types.ObjectId;
    date_created: Date | string;
    username: string;
    email: string;
    hash: string;
    salt: string;
    first_name: string;
    last_name: string;
    posts: Types.ObjectId[]; // post ids
  }

  interface Tag {
    _id: Types.ObjectId;
    name: string;
  }
}
