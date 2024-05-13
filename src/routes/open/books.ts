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
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
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

booksRouter.get('/title/:title', (request: Request, response: Response) => {
    const theQuery =
        'SELECT title, authors, publication_year FROM books WHERE title ILIKE $1';
    const values = ['%' + request.params.title + '%'];
    pool.query(theQuery, values)
        .then((result) => {
            if (result.rowCount > 0) {
                response.send({
                    entries: result.rows,
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
 * @api {get} /:isbn13 Request to retrieve book of stated isbn13.
 *
 * @apiDescription Request to retrievce book based on stated isbn13.
 *
 * @apiName IsbnBook
 * @apiGroup Book
 *
 * @apiParam {string} name the isbn13 to look up the book.
 *
 * @apierror (404: Book Not Found) {string} message "Book not found"
 * @apierror {500: Server Error} {string} message "Server error - more than 1 ISBN found"
 * @apiSuccess {String[]} entries the aggregate of all entries as the following string:
 *      "{<code>priority</code>} - [<code>name</code>] says: <code>message</code>"
 */
booksRouter.get('/:isbn13', (request: Request, response: Response) => {
    const theQuery = 'SELECT title FROM books WHERE isbn13 = $1';
    const values = [request.params.isbn13];

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
                message: 'server error - contact support',
            });
        });
});

booksRouter.put(
    '/update-book-rating/:isbn',
    async (request: Request, response: Response) => {
        const isbn13 = [request.params.isbn13];
        const starInserted = [request.body.star];

        //checks if starInserted is a integer number
        if (
            typeof starInserted !== 'number' ||
            starInserted < 1 ||
            starInserted > 5
        ) {
            response.status(400).send('starInserted must be a number from 1-5');
            return;
        }

        const theQuery =
            'SELECT rating_1_star, rating_2_star, rating_3_star, rating_4_star, rating_5_star FROM books WHERE isbn13 = $1';

        try {
            // We'll get the current star ratings and average rating
            const result = await pool.query(theQuery, [isbn13]);
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
            const { star1, star2, star3, star4, star5 } = book; //get all the star values from that row.

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
                'UPDATE books SET star1 = $1, star2 = $2, star3 = $3, star4 = $4, star5 = $5, avg_rating = $6 ratings_count = $7 WHERE isbn13 = $8 RETURNING *',
                [
                    newStar1,
                    newStar2,
                    newStar3,
                    newStar4,
                    newStar5,
                    newAverageRating,
                    totalStars,
                    isbn13,
                ]
            );

            response.send(updateResult.rows[0]);
        } catch (err) {
            console.error('Error updating book rating:', err);
            response.status(500).send('Internal Server Error');
        }
    }
);

// "return" the router
export { booksRouter };
