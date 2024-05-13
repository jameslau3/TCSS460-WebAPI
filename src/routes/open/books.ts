//express is the framework we're going to use to handle requests
import express, { NextFunction, Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool, validationFunctions } from '../../core/utilities';

const booksRouter: Router = express.Router();

booksRouter.get('/all', (request: Request, response: Response) => {
    const theQuery = 'SELECT * FROM books';

    pool.query(theQuery)
        .then((result) => {
            // result.rows array are the records returned from the SQL statement.
            // An INSERT statement will return a single row, the row that was inserted.
            response.status(201).send({
                entry: result.rows[0],
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
                    message: 'server error - contact support',
                });
            }
        });
});

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

booksRouter.get('/title/', (request: Request, response: Response) => {
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

booksRouter.post('/new/', (request: Request, response: Response) => {
    const theQuery =
        'INSERT INTO books(id, title, authors, publication_year, isbn13, original_title) VALUES ($1, $2, $3, $4, $5, $2) RETURNING *';
    const values = [
        request.body.id,
        request.body.title,
        request.body.authors,
        request.body.publication_year,
        request.body.isbn,
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
                    message: 'server error - contact support',
                });
            }
        });
});

booksRouter.delete('/del/:id', (request: Request, response: Response) => {
    const theQuery = 'DELETE FROM books WHERE id = $1 RETURNING *';
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

// "return" the router
export { booksRouter };
