//express is the framework we're going to use to handle requests
import express, { NextFunction, Request, Response, Router } from 'express';
//Access the connection to Postgres Database
import { pool, validationFunctions } from '../../core/utilities';

const booksRouter: Router = express.Router();

booksRouter.get('/all', (request: Request, response: Response) => {
    const theQuery = 'SELECT * FROM books';

    pool.query(theQuery)
        .then((result) => {
            response.send({
                entries: result.rows,
            });
        })
        .catch((error) => {
            //log the error
            console.error('DB Query error on GET all');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        });
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

booksRouter.get('/title/', (request: Request, response: Response) => {
    const theQuery =
        'SELECT title, authors, publication_year FROM books ORDER BY title asc';
    pool.query(theQuery)
        .then((result) => {
            if (result.rowCount > 0) {
                response.send({
                    entries: result.rows,
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

// "return" the router
export { booksRouter };
