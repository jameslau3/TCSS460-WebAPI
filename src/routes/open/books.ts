//express is the framework we're going to use to handle requests
import express, { NextFunction, Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool, validationFunctions } from '../../core/utilities';

const booksRouter: Router = express.Router();

/**
 * @api {get} /books Request to all retrieve entry books.
 *
 * @apiDescription Request to retrieve all the entry books with pagination.
 *
 * @apiName GetAllBooks
 * @apiGroup Book
 *
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      ""title": <code>title</code>"
 */
booksRouter.get('/all', async (request: Request, response: Response) => {
    const page = parseInt(request.query.page as string, 10) || 1; //default is page 1.
    const limit = parseInt(request.query.limit as string, 10);

    // const firstIndex = (page - 1) * limit;
    // const lastIndex = page * limit;

    const offset = (page - 1) * limit;

    const theQuery = 'SELECT title FROM books LIMIT $1 OFFSET $2';
    const countQuery = 'SELECT COUNT(*) FROM books';
    try {
        const result = await pool.query(theQuery, [limit, offset]);

        const countBooks = await pool.query(countQuery);
        const totalBooks = parseInt(countBooks.rows[0].count, 10);
        const totalPage = Math.ceil(totalBooks / limit);
        // console.log(totalBooks);
        // console.log(totalPage);
        response.send({
            books: result.rows,
            pagination: {
                page: page,
                limit: limit,
                totalPages: totalPage,
            },
        });
    } catch (err) {
        console.error('Error querying database:', err);
        response.status(500).send('server error - contact support');
    }
});

/**
 * @api {get} /books/title/:title Request to get books by relative titles.
 *
 * @apiDescription Request to retrieve all books with relative title.
 *
 * @apiName GetByTitle
 * @apiGroup Book
 *
 * @apiParam {String} title the title of the book
 *
 * @apiSuccess {string} title the title of the book
 * @apiSuccess {string} authors the authors of the book
 * @apiSuccess {int} publication_year the year the book was published
 *
 * @apiError (404: Title Not Found) {string} message "Book title not found"
 *
 */
booksRouter.get('/title/:title', (request: Request, response: Response) => {
    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;
    const theQuery =
        'SELECT title, authors, publication_year FROM books WHERE title ILIKE $1 LIMIT $2 OFFSET $3';
    const countQuery = 'SELECT COUNT(*) FROM books';
    const values = ['%' + request.params.title + '%', limit, offset];
    pool.query(theQuery, values)
        .then(async (result) => {
            const countBooks = await pool.query(countQuery);
            const totalBooks = parseInt(countBooks.rows[0].count, 10);
            const totalPage = Math.ceil(totalBooks / limit);
            if (result.rowCount > 0) {
                response.send({
                    entries: result.rows,
                    pagination: {
                        page: page,
                        limit: limit,
                        totalPages: totalPage,
                    },
                });
            } else {
                response.status(404).send({
                    message: `No books found with that title`,
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET title/~title');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {get} /books/SortAZ Request to get all books sorting by Alphabetical order.
 *
 * @apiDescription Request to retrieve all books sorted in Alphabetical order.
 *
 * @apiName SortByTitleAZ
 * @apiGroup Book
 *
 * @apiSuccess {string} title the title of the book
 * @apiSuccess {int} publication_year the year the book was published
 * @apiSuccess {string} authors the authors of the book
 *
 */
booksRouter.get('/SortAZ/', (request: Request, response: Response) => {
    const page = parseInt(request.query.page as string, 10) || 1;
    const limit = parseInt(request.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    const theQuery = `SELECT title, authors, publication_year FROM books ORDER BY title asc LIMIT $1 OFFSET $2`;
    const countQuery = 'SELECT COUNT(*) FROM books';
    pool.query(theQuery, [limit, offset])
        .then(async (result) => {
            const countBooks = await pool.query(countQuery);
            const totalBooks = parseInt(countBooks.rows[0].count, 10);
            const totalPage = Math.ceil(totalBooks / limit);
            if (result.rowCount > 0) {
                response.send({
                    entries: result.rows,
                    pagination: {
                        page: page,
                        limit: limit,
                        totalPages: totalPage,
                    },
                });
            } else {
                response.status(404).send({
                    message: `No books found in database`,
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET title/~title');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {post} /book/new/ Create a new book info entry.
 *
 * @apiDescription Request to create a new book with all necessary information.
 *
 * @apiName CreateBook
 * @apiGroup Book
 *
 * @apiBody {number} id The unique identifier for the book in the database
 * @apiBody {string} isbn13 The ISBN13 of the book
 * @apiBody {string} authors The authors of the book
 * @apiBody {number} publication_year The year the book was published
 * @apiBody {string} original_title The original title of the book
 * @apiBody {string} title The title of the book
 * @apiBody {number} rating_avg The average rating of the book
 * @apiBody {number} rating_count The total number of ratings the book has received
 * @apiBody {number} rating_1 The number of 1-star ratings the book has received
 * @apiBody {number} rating_2 The number of 2-star ratings the book has received
 * @apiBody {number} rating_3 The number of 3-star ratings the book has received
 * @apiBody {number} rating_4 The number of 4-star ratings the book has received
 * @apiBody {number} rating_5 The number of 5-star ratings the book has received
 * @apiBody {string} image_url The URL of the book's image
 * @apiBody {string} small_image_url The URL of the book's small image
 *
 * @apiSuccess {string} message "Book added"
 *
 * @apiError (400: isbn13 exists) {String} message "isbn13 already exists"
 * @apiError (400: id exists) {String} message "id already exists"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 */
booksRouter.post('/new/', (request: Request, response: Response) => {
    const theQuery =
        'INSERT INTO books(id, title, authors, publication_year, isbn13, original_title) VALUES ($1, $2, $3, $4, $5, $2) RETURNING *';
    const values = [
        request.body.id,
        request.body.title,
        request.body.authors,
        request.body.publication_year,
        request.body.isbn13,
    ];

    pool.query(theQuery, values)
        .then((result) => {
            // result.rows array are the records returned from the SQL statement.
            // An INSERT statement will return a single row, the row that was inserted.
            response.status(201).send({
                entry: result.rows,
            });
        })
        .catch((error) => {
            if (
                error.detail != undefined &&
                (error.detail as string).endsWith('already exists.')
            ) {
                console.error('Name exists');
                response.status(400).send({
                    message: 'Name exists',
                });
            } else {
                //log the error
                console.error('DB Query error on POST');
                console.error(error);
                response.status(500).send({
                    message: 'server error - contact supports',
                });
            }
        });
});

/**
 * @api {delete} /book/del/:isbn13 Delete a book from the database using the ISBN.
 *
 * @apiDescription Request to delete a book from the database with the ISBN.
 *
 * @apiName DeleteBookISBN
 * @apiGroup Book
 *
 * @apiParam {String} isbn13 The ISBN13 of the book.
 *
 * @apiSuccess {string} message "{<code>id</code>} - [<code>isbn13</code>] : [<code>title</code>] deleted"
 *
 * @apiError (404: id Not Found) {String} message "isbn13 not found"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 */
booksRouter.delete('/del/:isbn', (request: Request, response: Response) => {
    const theQuery = 'DELETE FROM books WHERE isbn13 = $1 RETURNING *';
    const values = [request.params.id];

    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount == 1) {
                response.send({
                    entry: 'Deleted: ' + result.rows[0],
                });
            } else {
                response.status(404).send({
                    message: 'Name not found',
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on DELETE /:id');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

/**
 * @api {get} /book/:isbn13 Request to get a book of a specific ISBN.
 *
 * @apiDescription Request to retrieve a book of a specific ISBN.
 *
 * @apiName GetByISBN
 * @apiGroup Book
 *
 * @apiParam {String} isbn13 The ISBN13 of the book.
 *
 * @apierror (404: Book Not Found) {string} message "Book not found"
 * @apierror {500: Server Error} {string} message "Server error - more than 1 ISBN found"
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      ""title": <code>message</code>"
 */
booksRouter.get('/:isbn13', (request: Request, response: Response) => {
    const theQuery = 'SELECT title FROM books WHERE isbn13 = $1';
    const values = [request.params.isbn13];
    // console.log(values);

    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount == 1) {
                response.send({
                    entry: result.rows[0],
                });
            } else if (result.rowCount == 0) {
                response.status(404).send({
                    message: 'Book not found',
                });
            } else {
                response.status(500).send({
                    message: 'Server error - more than 1 ISBN found',
                });
            }
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET /:isbn');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact supports',
            });
        });
});

/**
 * @api {put} /rating/:isbn13 Request to change and add a rating to a book.
 *
 * @apiDescription Request to add a rating to a book and update the rating of that book.
 *
 * @apiName AddBookRating
 * @apiGroup Book
 *
 * @apiBody {number} priority a rating priority [1-5]
 *
 * @apiparam {number} name the isbn13 for the book we want to rate
 *
 * @apiSuccess {String} entry the string
 *      "Updated: {<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 *
 * @apiError (400: Wrong body) {String} message "starInserted must be a number from 1-5"
 * @apiError (500: Missing Parameters) {String} message "Server error - more than 1 ISBN found"
 * @apiError (404: Book not found) {String} message "Book not found"
 *
 * @apiSuccess {String} entries the book into a string
 *        "title:" {}
 */
booksRouter.put(
    '/rating/:isbn13',
    async (request: Request, response: Response) => {
        const isbn = request.params.isbn13;
        // const starInserted = [request.body.star];
        const starInserted: number = request.body.star as number;

        //checks if starInserted is a integer number
        if (
            !validationFunctions.isNumberProvided(starInserted) ||
            starInserted < 1 ||
            starInserted > 5
        ) {
            response.status(400).send({
                message: 'starInserted must be a number from 1-5',
            });
            return;
        }
        // console.log(starInserted);
        //  console.log(value);
        const theQuery =
            'SELECT rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star FROM books WHERE isbn13 = $1';

        try {
            // We'll get the current star ratings and average rating
            const result = await pool.query(theQuery, [isbn]);
            if (result.rowCount > 1) {
                response.status(500).send({
                    message: 'Server error - more than 1 ISBN found',
                });
            }
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: 'Book not found',
                });
            }
            const book = result.rows[0]; //get the 1 row
            let star1 = book.rating_1_star;
            let star2 = book.rating_2_star;
            let star3 = book.rating_3_star;
            let star4 = book.rating_4_star;
            let star5 = book.rating_5_star;
            // console.log(book);

            star1 = star1 !== null ? star1 : 0;
            star2 = star2 !== null ? star2 : 0;
            star3 = star3 !== null ? star3 : 0;
            star4 = star4 !== null ? star4 : 0;
            star5 = star5 !== null ? star5 : 0;
            // Calculate new star ratings. The star number the user choose, we'll increment it by one.
            const newStar1 = starInserted == 1 ? star1 + 1 : star1;
            const newStar2 = starInserted == 2 ? star2 + 1 : star2;
            const newStar3 = starInserted == 3 ? star3 + 1 : star3;
            const newStar4 = starInserted == 4 ? star4 + 1 : star4;
            const newStar5 = starInserted === 5 ? star5 + 1 : star5;

            // Calculate new average rating
            const totalRatings =
                1 * newStar1 +
                2 * newStar2 +
                3 * newStar3 +
                4 * newStar4 +
                5 * newStar5;
            const totalStars =
                newStar1 + newStar2 + newStar3 + newStar4 + newStar5; // Sum of stars from star 1 to star 5
            const newAverageRating = totalRatings / totalStars; //will calculate the new average rating after adding a star.

            // Update the star ratings and average rating in the database
            const updateResult = await pool.query(
                'UPDATE books SET rating_1_star = $1, rating_2_star = $2, rating_3_star = $3, rating_4_star = $4, rating_5_star = $5, rating_avg = $6, rating_count = $7 WHERE isbn13 = CAST($8 AS BIGINT) RETURNING *',
                [
                    newStar1,
                    newStar2,
                    newStar3,
                    newStar4,
                    newStar5,
                    newAverageRating,
                    totalStars,
                    isbn,
                ]
            );

            response.status(200).send({
                book: updateResult.rows[0],
            });
        } catch (err) {
            console.error('Error updating book rating:', err);
            response.status(500).send('Internal Server Error');
        }
    }
);

booksRouter.get('/all/by-author', (request: Request, response: Response) => {
    const authorName = request.query.author;
    if (!authorName) {
        response.status(400).send({
            message: 'Author name is required',
        });
        return;
    }

    const queryParams = [`%${authorName}%`];
    const theQuery = 'SELECT title FROM books WHERE authors LIKE $1';

    pool.query(theQuery, queryParams)
        .then((result) => {
            response.send({
                entries: result.rows,
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET by author');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

booksRouter.get('/all/by-rating', (request: Request, response: Response) => {
    const ratingString = request.query.rating as string;

    // Parse the rating string to a float
    const rating = parseFloat(ratingString);

    if (isNaN(rating) || rating < 1 || rating > 5) {
        response.status(400).send({
            message: 'Rating must be a number between 1 and 5',
        });
        return;
    }

    const queryParams = [rating];
    const theQuery = 'SELECT title FROM books WHERE rating_avg = $1';

    pool.query(theQuery, queryParams)
        .then((result) => {
            response.send({
                entries: result.rows,
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET by rating');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
});

// "return" the router
export { booksRouter };
