var mysql = require('mysql');
var moment = require('moment');
var db = (function(mysql) {
  var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'screeples'
  });
  //var connection = mysql.createConnection({
  //  host     : 'us-cdbr-iron-east-04.cleardb.net',
  //  user     : 'b2549d9a90215a',
  //  password : 'ab24085b',
  //  database : 'heroku_65634fb7bd563bf'
  //});

  connection.connect(function(err) {
    if (err) {
      console.error('error connecting to ' + connection.database + ' db: ' + err.stack);
      return;
    }

    console.log('connected as id ' + connection.threadId);
  });

  function getScores(callback) {
    connection.query('SELECT * FROM scores', function (err, results) {
      if (err) throw err;

      if (typeof callback === 'function') {
        callback(results);
      }
    });
  }

  // Returns weekly high scores
  function getHighScores(callback) {
    var weekAgo = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
      
    var query = `
      SELECT DISTINCT * 
      FROM scores
      WHERE date > '${weekAgo}'
      ORDER BY score DESC
      LIMIT 5 
    `;
    connection.query(query, function (err, results) {
      if (err) throw err;

      if (typeof callback === 'function') {
        callback(results);
      }
    });
  }

  function addScore(playerData) {
    var inserts = {
      name: playerData.name,
      score: playerData.score,
      date: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    connection.query('INSERT INTO scores SET ?', inserts, function (err, results) {
      if (err) throw err;
    });
  }

  return {
    getScores,
    getHighScores,
    addScore
  };
})(mysql);

module.exports = db;
