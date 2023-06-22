import { Types } from 'mongoose';

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CONNECTION_URL: string;
      SESSION_SECRET: string;
      PRIV_ACCESS_KEY: string;
      PUB_ACCESS_KEY: string;
      PRIV_REFRESH_KEY: string;
      PUB_REFRESH_KEY: string;
      PORT?: string;
      ENV?: 'development' | 'production';
    }
  }

  namespace Express {
    interface User {
      _id: Types.ObjectId;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      is_admin: boolean;
      is_verified_author: boolean;
    }

    interface Post {
      _id: Types.ObjectId;
    }
  }

  interface ResponseError extends Error {
    status?: number;
  }

  type BlogCategory =
    | 'architecture'
    | 'art'
    | 'interior design'
    | 'lifestyle'
    | 'style + fashion'
    | 'tech'
    | 'travel';

  interface BlogPost {
    _id: Types.ObjectId;
    date_created: Date | string | number;
    title: string;
    slug: string;
    author: Types.ObjectId; // user id
    editors: Types.ObjectId[]; // user ids
    content: string;
    comments: Types.DocumentArray<Comment>;
    liked_by: Types.ObjectId[]; // user ids
    tags: Types.ObjectId[]; // tag ids
    edits: {
      timestamp: Date | string | number;
    }[];
    is_private: boolean;
    category: BlogCategory;
    display_img: {
      url: string;
      owner: string;
      source: string;
    };
  }

  interface Comment {
    _id: Types.ObjectId;
    date_created: Date | string | number;
    author: Types.ObjectId;
    content: string;
    comment_level: number;
    parent_comment_id?: Types.ObjectId;
    liked_by: Types.ObjectId[]; // user ids
    edits: {
      timestamp: Date | string | number;
    }[];
  }

  interface User {
    _id: Types.ObjectId;
    date_created: Date | string | number;
    username: string;
    email: string;
    hash: string;
    salt: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
    is_verified_author: boolean;
    tokens: string[];
  }

  interface Tag {
    _id: Types.ObjectId;
    name: string;
  }
}
