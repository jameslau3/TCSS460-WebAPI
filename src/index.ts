import express, { Express, Request, Response, request } from 'express';

import cors from 'cors';

import { routes } from './routes';
import { pool } from './core/utilities';

const app: Express = express();

const PORT: number = parseInt(process.env.PORT) || 4001;

app.use(cors());

/*
 * This middleware function parses JSON in the body of POST requests
 */
app.use(express.json());

app.use(routes);

app.get('/', (request: Request, response: Response) => {
    response.send('<h1>Hello World!</h1>');
});

app.get('/books/all', (request: Request, response: Response) => {
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

app.get('/books/by_author', (request: Request, response: Response) => {
    const authorName = request.query.author;
    if (!authorName) {
        response.status(400).send({
            message: 'Author name is required',
        });
        return;
    }

    const queryParams = [`%${authorName}%`];
    const theQuery = 'SELECT * FROM books WHERE authors LIKE $1';

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

app.get('/books/by_rating', (request: Request, response: Response) => {
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
    const theQuery = 'SELECT * FROM books WHERE rating_avg = $1';

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

app.listen(PORT, () => {
    return console.log(`Express is listening at http://localhost:${PORT}`);
});
