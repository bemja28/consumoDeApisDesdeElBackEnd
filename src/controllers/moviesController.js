const path = require('path');
const db = require('../database/models');
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const moment = require('moment');
const fetch = require('node-fetch');
const { title } = require('process');


//Aqui tienen otra forma de llamar a cada uno de los modelos
const Movies = db.Movie;
const Genres = db.Genre;
const Actors = db.Actor;
const API = 'http://www.omdbapi.com/?apikey=d4e35e92';

const moviesController = {
    'list': (req, res) => {
        db.Movie.findAll({
            include: ['genre']
        })
            .then(movies => {
                res.render('moviesList.ejs', {movies})
            })
    },
    'detail': (req, res) => {
        db.Movie.findByPk(req.params.id,
            {
                include : ['genre']
            })
            .then(movie => {
                res.render('moviesDetail.ejs', {movie});
            });
    },
    'new': (req, res) => {
        db.Movie.findAll({
            order : [
                ['release_date', 'DESC']
            ],
            limit: 5
        })
            .then(movies => {
                res.render('newestMovies', {movies});
            });
    },
    'recomended': (req, res) => {
        db.Movie.findAll({
            include: ['genre'],
            where: {
                rating: {[db.Sequelize.Op.gte] : 8}
            },
            order: [
                ['rating', 'DESC']
            ]
        })
            .then(movies => {
                res.render('recommendedMovies.ejs', {movies});
            });
    },
    //Aqui debo modificar para crear la funcionalidad requerida
    'buscar': async(req, res) => {
        const {titulo} = req.query;
        const urlBase = 'http://www.omdbapi.com/'
        const apiKey = process.env.API_KEY

        try {

            let movie = await db.Movie.findOne({
                where : {
                    title : {
                        [Op.substring] : titulo
                    }
                }
            })

            if (!movie){
                let response = await fetch(`${urlBase}?apiKey=${apiKey}&t=${titulo}`);
                movie = await response.json()
            }else{
                // const {Title, Released, imdbRating, Awards, Runtime} = movie;
                const {title,release_date,awards,length} = movie
                movie = {
                            Title : title,
                            Poster : 'http://localhost:3001/img/logo-DH.png',
                            Year : moment(release_date).format('YYYY'),
                            Awards : awards,
                            Runtime : length
                        }
/*
                let awardsArray = Awards.split(' ');
                let awardsFilter = awardsArray.filter(char => !isNaN(char));
                let awardsTotal = awardsFilter.reduce((acum, num) => +acum + +num);
*/

            //    await db.Movie.create({
            //         title : Title,
            //         rating : +imdbRating,
            //         awards : Awards.split(' ').filter(char => !isNaN(char)).reduce((acum, num) => +acum + +num),
            //         release_date : moment(Released),
            //         length : parseInt(Runtime),
            //         genre_id : null
            //     })

                // movie = {
                //         Title : title,
                //         Poster : 'http://localhost:3001/img/logo-DH.png',
                //         Year : moment(release_date).format('YYYY'),
                //         Awards : awards,
                //         Runtime : length
                //         }


            }
            return res.render('moviesDetailOmdb',{
                movie
            })

        } catch (error) {
            console.log(error);
        }

    },
    //Aqui dispongo las rutas para trabajar con el CRUD
    add: function (req, res) {
        let promGenres = Genres.findAll();
        let promActors = Actors.findAll();
        
        Promise
        .all([promGenres, promActors])
        .then(([allGenres, allActors]) => {
            return res.render(path.resolve(__dirname, '..', 'views',  'moviesAdd'), {allGenres,allActors})})
        .catch(error => res.send(error))
    },
    create: function (req,res) {
        Movies
        .create(
            {
                title: req.body.title,
                rating: req.body.rating,
                awards: req.body.awards,
                release_date: req.body.release_date,
                length: req.body.length,
                genre_id: req.body.genre_id
            }
        )
        .then(()=> {
            return res.redirect('/movies')})            
        .catch(error => res.send(error))
    },
    edit: function(req,res) {
        let movieId = req.params.id;
        let promMovies = Movies.findByPk(movieId,{include: ['genre','actors']});
        let promGenres = Genres.findAll();
        let promActors = Actors.findAll();
        Promise
        .all([promMovies, promGenres, promActors])
        .then(([Movie, allGenres, allActors]) => {
            Movie.release_date = moment(Movie.release_date).format('L');
            return res.render(path.resolve(__dirname, '..', 'views',  'moviesEdit'), {Movie,allGenres,allActors})})
        .catch(error => res.send(error))
    },
    update: function (req,res) {
        let movieId = req.params.id;
        Movies
        .update(
            {
                title: req.body.title,
                rating: req.body.rating,
                awards: req.body.awards,
                release_date: req.body.release_date,
                length: req.body.length,
                genre_id: req.body.genre_id
            },
            {
                where: {id: movieId}
            })
        .then(()=> {
            return res.redirect('/movies')})            
        .catch(error => res.send(error))
    },
    delete: function (req,res) {
        let movieId = req.params.id;
        Movies
        .findByPk(movieId)
        .then(Movie => {
            return res.render(path.resolve(__dirname, '..', 'views',  'moviesDelete'), {Movie})})
        .catch(error => res.send(error))
    },
    destroy: function (req,res) {
        let movieId = req.params.id;
        Movies
        .destroy({where: {id: movieId}, force: true}) // force: true es para asegurar que se ejecute la acción
        .then(()=>{
            return res.redirect('/movies')})
        .catch(error => res.send(error)) 
    }
}

module.exports = moviesController;