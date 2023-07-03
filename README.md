# Project: Blog API

[The frontend repository for this API can be found here.](https://github.com/renchester/design-blog)

This repository comprises the API/backend of the Dezien Blog project. The app serves as the engine to power the communication between the frontend and the server. This app is created with MongoDB/Mongoose, ExpressJS, NodeJS, and PassportJS.

## Table of Contents

- [Key Features](#key-features)
- [Documentation](#documentation)
  - [Authentication](#authentication)
    - [Login](#login)
    - [Logout](#logout)
    - [Refresh](#refresh)
  - [API](#api)
    - [All Posts](#all-posts)
    - [Post [by Slug]](#post-by-slug)
    - [Post [by Category]](#posts-by-category)
    - [Post [by Tagname]](#posts-by-tagname)
    - [Post Comments](#post-comments)

## Key Features

1. **RESTful Architecture** The API follows a RESTful architecture, ensuring that the resources within the blog app are organized and accessible. Through this architeccture, data are retrieved and manipulated through standardized HTTP methods--allowing for efficient communication between client and server.

1. **User Authentication and Authorization**: The backend features an `auth` route that handles user registration, login, and logout. The app utilizes [PassportJS](http://www.passportjs.org/) with local and JWT strategies to handle auth flow. Throughout the app, auth middleware are used to ensure only authenticated and properly-authorized users can perform special actions or access protected routes within the API.

1. **JWT Issuance for Login Persistence**: Upon login, the auth server issues a refresh token and an access token to be handled by the frontend. These tokens are signed with a RSA private key, to be verified later on with a RSA public key. These tokens are used by the auth middleware to handle requests in the API's protected routes.

1. **Integration with the Frontend**: The backend seamlessly integrates with the frontend, facilitating real-time data synchronization, instant updates, and efficient communication between the client and server. This integration ensures a smooth user experience and enables dynamic content delivery.

---

# Documentation

The Dezien Blog API is organized around [REST](http://en.wikipedia.org/wiki/Representational_State_Transfer) architecture. The API uses resource-oriented URLs, accepts form-encoded request bodies, and returns JSON-encoded responses.

## Authentication

The Dezien Blog API uses JWTs to authenticate requests for protected routes. An access token issued on login with the format `Bearer <token>` must be attached to the Authorization header on requests to protected routes.

**Auth Base URL**:

```
https://dezien-blog-api.onrender.com/auth
```

### Login

```
POST /login
```

Body Parameters:

- `email`
- `password`

Returns:

- `accessToken` - A JWT with a 10-minute expiration that you can attach to the Authorization header in the format `Bearer <token>` for access to protected routes. This accessToken has a payload that includes basic user information and authorization.
- `refreshToken`\* - This refresh token is sent inside an HTTPOnly cookie which is used to refresh expired access tokens inside the `/refresh` endpoint.

### Logout

```
POST /logout
```

Cookie Parameters:

- `jwt` - This must be a valid refresh token issued upon user login. On logout, this token will be deleted from the database.

### Refresh

```
GET /refresh
```

Cookie Parameters:

- `jwt` - This is a refresh token issued upon user login. On refresh, this token will be verified. If verification succeeds, a new access token will be issued.

Returns:

- `accessToken` - This is a new access token with a 10-minute expiration and the flag `refresh`, which can be used to retain access to protected routes.

---

## API

**API Base URL**:

```
https://dezien-blog-api.onrender.com/api
```

### **Post [by Slug]**

```
GET /posts/:slug
```

Route Parameters:

- `slug` - A slugified version of the blog post title.

Returns:

- A BlogPost Object

```json
{
  "post": {
    "display_img": {
      "url": "<img url string>",
      "owner": "Taylor Heery",
      "source": "Unsplash"
    },
    "_id": "000000",
    "date_created": "2023-06-28T21:02:53.866Z",
    "title": "Unveiling the Rich Heritage: Bob Sira&#x27;s African-Inspired Ceramic Collection",
    "slug": "unveiling-the-rich-heritage-bob-siraandx27s-african-inspired-ceramic-collection",
    "author": {
      "_id": "649ca7df14b31500927c09dc",
      "username": "sarahmchlachlan",
      "is_admin": false,
      "is_verified_author": true,
      "email": "sarahmclachlan@gmail.com",
      "first_name": "Sarah",
      "last_name": "McLachlan"
    },
    "editors": [],
    "liked_by": [
      {
        "_id": "649ca8a114b31500927c0a95",
        "username": "alessakici",
        "is_admin": false,
        "is_verified_author": true,
        "email": "alessandrokiciamu@gman.com",
        "first_name": "Alessandro",
        "last_name": "Kiciamu"
      }
    ],
    "tags": ["africa", "ceramics", "art", "culture"],
    "edits": [],
    "content": "In the world of art, inspiration knows no boundaries. It transcends time, cultures, and continents, giving birth to magnificent creations.",
    "comments": [
      {
        "date_created": "2023-06-30T05:21:16.814Z",
        "author": {
          "_id": "649ca8f714b31500927c0a9d",
          "username": "briennesar",
          "is_admin": false,
          "is_verified_author": true,
          "email": "briennesar@gman.com",
          "first_name": "Brienne",
          "last_name": "Sarto"
        },
        "content": "Can’t wait to go here for my next trip!",
        "comment_level": 1,
        "liked_by": [
          {
            "_id": "649ca8a114b31500927c0a95",
            "username": "alessakici",
            "is_admin": false,
            "is_verified_author": true,
            "email": "alessandrokiciamu@gman.com",
            "first_name": "Alessandro",
            "last_name": "Kiciamu"
          }
        ],
        "edits": [],
        "_id": "649e695e48c1a3c57d2d4812"
      }
    ],
    "is_private": false,
    "category": "art"
  },
  "success": true
}
```

### **All Posts**

```
GET /posts
```

Query Parameters:

- `limit` <sub><sup>optional</sup></sub> - Number. Specifies the amount of posts to retrieve. _Defaults to 10._
- `page` <sub><sup>optional</sup></sub> - Number. Specifies the number of posts to skip over. _Defaults to 1._

Returns:

```json
{
  "posts": [], // An array of post objects
  "success": "true"
}
```

### **Posts [by Category]**

```
GET /posts/category/:categoryname
```

Route Parameters:

- `categoryname` - Either one of `architecture`, `art`, `interior-design`, `lifestyle`, `style-fashion`, `tech`, or `travel`. These comprise all the valid categories in the blog.

Returns:

```json
{
  "category": "architecture",
  "posts": [], // An array of post objects
  "success": "true"
}
```

### **Posts [by Tagname]**

```
GET /posts/tags/:tagname
```

Route Parameters:

- `tagname` - string. Used to find posts with the exact tagname as given in the parameters.

Returns:

```json
{
  "tag": "culture",
  "posts": [], // An array of post objects
  "success": "true"
}
```

### **Post Comments**

```
GET /posts/:slug/comments
```

Route Parameters:

- `slug` - A slugified version of the blog post title.

Returns:

- An array of comment objects in that post

```json
{
  "comments": [
    {
      "date_created": "2023-06-30T05:21:16.814Z",
      "author": {
        "_id": "649ca8f714b31500927c0a9d",
        "username": "briennesar",
        "is_admin": false,
        "is_verified_author": true,
        "email": "briennesar@gman.com",
        "first_name": "Brienne",
        "last_name": "Sarto"
      },
      "content": "Can’t wait to go here for my next trip!",
      "comment_level": 1,
      "liked_by": [
        {
          "_id": "649ca8a114b31500927c0a95",
          "username": "alessakici",
          "is_admin": false,
          "is_verified_author": true,
          "email": "alessandrokiciamu@gman.com",
          "first_name": "Alessandro",
          "last_name": "Kiciamu"
        }
      ],
      "edits": [],
      "_id": "649e695e48c1a3c57d2d4812"
    }
  ],
  "success": true
}
```

---

This documentation is incomplete. Documentation for protected routes will be updated.

---

Developed by **Renchester Ramos**
