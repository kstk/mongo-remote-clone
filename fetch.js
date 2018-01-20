const uuidv1 = require('uuid/v1');
const Client = require('scp2').Client;
const fs = require('fs');
const path = require('path');
const node_ssh = require('node-ssh');
const cmd = require('node-cmd');
const ssh = new node_ssh();

function fetch(config) {

    let host = config.host;
    let username = config.username;
    let password = config.password;
    let originDb = config.originDb;
    let destDb = config.destDb;

    const fileid = uuidv1();
    const tarid = fileid + '.tar';

    console.log('temp files will be identified with: ' + fileid);

    var rolledback = false;

    var client = new Client({
        host: host,
        username: username,
        password: password
    });

    ssh.connect({
        host: host,
        username: username,
        password: password
    }).then(function () {
        console.log("connected");
        ssh.execCommand('mongodump -o ' + fileid + ' -d ' + originDb, {}).then(function (dumpResult) {
            // console.log('STDOUT: ' + dumpResult.stdout)
            // console.log('STDERR: ' + dumpResult.stderr)
            if (dumpResult.stderr.length === 0) {
                console.log('created dump');

                ssh.execCommand('tar -cvf ' + tarid + ' ' + fileid + '/').then(function (tarResult) {
                    if (tarResult.stderr.length === 0) {
                        console.log('created tar');
                        client.download(
                            tarid,
                            './' + tarid,
                            function (err) {
                                destroyTempFiles();
                                
                                if (!err) {
                                    console.log('copied tar from remote to local');

                                    cmd.get(
                                        'tar -xf ' + tarid,
                                        function (err, data, stderr) {
                                            if (!err) {
                                                console.log('untared local copy');
                                                cmd.get(
                                                    'mongorestore ' + fileid,
                                                    function (err, data, stderr) {
                                                        if (!err) {
                                                            console.log('restored database');
                                                            cmd.get(
                                                                'rm -rf ' + tarid + ' && rm -rf ' + fileid,
                                                                function (err, data, stderr) {
                                                                    if (!err) {
                                                                        console.log('deleted temp files locally');
                                                                    } else {

                                                                    }
                                                                });
                                                        } else {
                                                            console.log('RESTORE ERR: ', err);
                                                            console.log('Is mongodb running?');
                                                        }
                                                    });
                                            } else {
                                                console.log('UNTAR ERR: ', err);
                                            }
                                        }
                                    );
                                } else {
                                    console.log('SCP ERR: ' + err);
                                }
                            });

                    } else {
                        console.log('TAR STDERR: ' + tarResult.stderr);
                        destroyTempFiles();
                    }
                });
            } else {
                console.log('MONGODB DUMP STDERR: ' + dumpResult.stderr);
                destroyTempFiles();
            }
        });
    });



    function destroyTempFiles() {
        if (!rolledback) {
            client.close();

            ssh.execCommand('rm -rf ' + tarid + ' && rm -rf ' + fileid).then(function (deleteResult) {
                if (deleteResult.stderr.length === 0) {
                    console.log('removed temp files on remote server');
                } else {
                    console.log('RM STDERR: ' + deleteResult.stderr);
                }

                rolledback = true;
                ssh.dispose();
            });
        }
    }

}

module.exports = {  fetch };