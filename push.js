const uuidv1 = require('uuid/v1');
const Client = require('scp2').Client;
const fs = require('fs');
const path = require('path');
const node_ssh = require('node-ssh');
const cmd = require('node-cmd');
const ssh = new node_ssh();

function push(config) {
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

    cmd.get(
        'mongodump -o ' + fileid + ' -d ' + originDb,
        function (err, data, stderr) {
            if (!err) {
                console.log('created dump');
                cmd.get(
                    'tar -cvf ' + tarid + ' ' + fileid + '/',
                    function (err, data, stderr) {
                        if (!err) {
                            console.log('created tar');
                            client.upload(
                                './' + tarid,
                                tarid,
                                function (err) {
                                    destroyTempFiles();

                                    if (!err) {
                                        console.log("uploaded");

                                        ssh.connect({
                                            host: host,
                                            username: username,
                                            password: password
                                        }).then(function () {
                                            console.log('connected');
                                            ssh.execCommand('tar -xf ' + tarid).then(function (tarResult) {
                                                if (tarResult.stderr.length === 0) {
                                                    console.log('untared  remote copy');
                                                    //MISSING MONGORESTORE
                                                    ssh.execCommand('mongorestore ' + fileid, {}).then(function (restoreResult) {
                                                        if (restoreResult.stderr.length === 0) {
                                                            console.log('remote db restored');
                                                            ssh.execCommand('rm -rf ' + tarid + ' && rm -rf ' + fileid).then(function (deleteResult) {
                                                                if (deleteResult.stderr.length === 0) {
                                                                    console.log('removed temp files on remote server');
        
                                                                    client.close();
                                                                    ssh.dispose();
                                                                } else {
                                                                    console.log('RM STDERR: ' + deleteResult.stderr);
                                                                }
                                                            });
                                                        } else {
                                                            console.log('MONGO RESTORE ERR: ', restoreResult.stderr);
                                                        }
                                                    });
                                                } else {
                                                    console.log('UNTAR ERR: ', err);
                                                }
                                            });

                                        });
                                    } else {
                                        console.log('UPLOAD ERR: ', err);
                                    }
                                });
                        } else {
                            console.log('TAR ERR: ', err);
                            destroyTempFiles();
                        }
                    });
            } else {
                console.log('LOCAL DUMP ERR: ', err);
                destroyTempFiles();
            }
        });


    function destroyTempFiles() {
        if (!rolledback) {
            cmd.get(
                'rm -rf ' + tarid + ' && rm -rf ' + fileid,
                function (err, data, stderr) {
                    if (!err) {
                        console.log('removed temp files locally');
                    } else {
                        onsole.log('RM STDERR: ' + err);
                    }

                    rolledback = true;
                });
        }
    }

}

module.exports = { push };