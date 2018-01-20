#!/usr/bin/env node

const program = require('commander');
const { prompt } = require('inquirer');
const { fetch } = require('./fetch.js');
const { push } = require('./push.js');

const fetchQuestion = [{
    type: 'confirm',
    name: 'confirm',
    message: 'You are about to FETCH (cloning) a remote DB to a local DB. Is this righ?'
}];

const pushQuestion = [{
    type: 'confirm',
    name: 'confirm',
    message: 'You are about to PUSH (cloning) a local DB to a remote DB. Is this right?'
}];

const questions = [
    {
        type: 'input',
        name: 'host',
        message: 'Enter host ...'
    },
    {
        type: 'input',
        name: 'username',
        message: 'Enter username ...'
    },
    {
        type: 'input',
        name: 'password',
        message: 'Enter password ...'
    },
    {
        type: 'input',
        name: 'originDb',
        message: 'Enter originDb ...'
    },
    {
        type: 'input',
        name: 'destDb',
        message: 'Enter destDb ...'
    }
];

program
    .version('0.0.1')
    .description('Clone MongoDBs');

program
    .command('fetch')
    .alias('f')
    .description('Clone db from remote to local')
    .action(function () {
        prompt(fetchQuestion).then(function (answers) {
            if (answers.confirm) {
                prompt(questions).then(function (answers) {
                    prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Is this connection information for the FETCH operation correct? ' + JSON.stringify(answers)
                    }]).then(function (ok) {
                        fetch(answers);
                    });
                });
            }
        });
    });

program
    .command('push')
    .alias('p')
    .description('Clone db from remote to local')
    .action(function () {
        prompt(pushQuestion).then(function (answers) {
            if (answers.confirm) {
                prompt(questions).then(function (answers) {
                    prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Is this connection information for the PULL operation correct? ' + JSON.stringify(answers)
                    }]).then(function (ok) {
                        push(answers);
                    });
                });
            };
        });
    });

program.parse(process.argv);