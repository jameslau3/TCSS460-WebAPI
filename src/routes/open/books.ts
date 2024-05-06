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

// "return" the router
export { booksRouter };
