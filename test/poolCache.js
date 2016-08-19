/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   67. poolCache.js
 *
 * DESCRIPTION
 *   Testing properties of connection pool.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('67. poolCache.js', function() {
  beforeEach(function() {
    // ensure that no poolAlias has been specified
    delete dbConfig.poolAlias;
  });

  after(function() {
    // ensure that no poolAlias has been specified
    delete dbConfig.poolAlias;
  });

  describe('67.1 basic functional tests', function() {
    it('67.1.1 caches pool as default if pool is created when cache is empty', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        var defaultPool;

        should.not.exist(err);

        pool.should.be.ok();

        // Not specifying a name, default will be used
        defaultPool = oracledb.getPool();

        should.strictEqual(pool, defaultPool);

        (defaultPool.poolAlias).should.equal('default');

        pool.close(function(err){
          should.not.exist(err);
          done();
        });
      });
    });

    it('67.1.2 removes the pool from the cache on terminate', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        pool.should.be.ok();

        pool.close(function(err){
          var defaultPool;

          should.not.exist(err);

          (function() {
            defaultPool = oracledb.getPool();
          }).should.throw(/^NJS-047:/);

          should.not.exist(defaultPool);

          done();
        });
      });
    });

    it('67.1.3 can cache and retrieve an aliased pool', function(done) {
      var poolAlias = 'random-pool-alias';

      dbConfig.poolAlias = poolAlias;

      oracledb.createPool(dbConfig, function(err, pool) {
        var aliasedPool;

        should.not.exist(err);

        pool.should.be.ok();

        pool.poolAlias.should.equal(poolAlias);

        aliasedPool = oracledb.getPool(poolAlias);

        should.strictEqual(pool, aliasedPool);

        pool.close(function(err){
          should.not.exist(err);
          done();
        });
      });
    });

    it('67.1.4 throws an error if the poolAlias already exists in the cache', function(done) {
      dbConfig.poolAlias = 'pool1';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        // Creating another pool with the same poolAlias as before
        oracledb.createPool(dbConfig, function(err, pool2) {
          should.exist(err);

          (err.message).should.startWith('NJS-046:');

          pool1.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.1.5 does not throw an error if multiple pools are created without a poolAlias', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        // Creating another pool with no poolAlias
        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          pool1.close(function(err){
            should.not.exist(err);

            pool2.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.1.6 throws an error if poolAttrs.poolAlias is not a string or number', function(done) {
      // Setting poolAlias to something other than a string or number. Could be
      // boolean, object, array, etc.
      dbConfig.poolAlias = {};

      oracledb.createPool(dbConfig, function(err, pool) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.1.7 makes poolAttrs.poolAlias a read-only attribute on the pool named poolAlias', function(done) {
      dbConfig.poolAlias = 'my-pool';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        pool.should.be.ok();

        (pool.poolAlias).should.equal(dbConfig.poolAlias);

        (function() {
          pool.poolAlias = 'some-new-value';
        }).should.throw(/^NJS-014:/);

        (pool.poolAlias).should.equal(dbConfig.poolAlias);

        pool.close(function(err) {
          should.not.exist(err);

          done();
        });
      });
    });

    it('67.1.8 retrieves the default pool, even after an aliased pool is created', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = 'random-pool-alias';

        oracledb.createPool(dbConfig, function(err, pool2) {
          var defaultPool;

          should.not.exist(err);

          pool2.should.be.ok();

          // Not specifying a name, default will be used
          defaultPool = oracledb.getPool();

          should.strictEqual(pool1, defaultPool);

          (defaultPool.poolAlias).should.equal('default');

          pool1.close(function(err){
            should.not.exist(err);

            pool2.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.1.9 retrieves the right pool, even after multiple pools are created', function(done) {
      var aliasToGet = 'random-pool-alias-2';

      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = aliasToGet;

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          dbConfig.poolAlias = 'random-pool-alias-3';

          oracledb.createPool(dbConfig, function(err, pool3) {
            var secondPool;

            should.not.exist(err);

            secondPool = oracledb.getPool(aliasToGet);

            should.strictEqual(pool2, secondPool);

            (secondPool.poolAlias).should.equal(aliasToGet);

            pool1.close(function(err){
              should.not.exist(err);

              pool2.close(function(err){
                should.not.exist(err);

                pool3.close(function(err){
                  should.not.exist(err);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('67.1.10 throws an error if the pool specified in getPool doesn\'t exist', function(done) {
      (function() {
        oracledb.getPool();
      }).should.throw(/^NJS-047:/);

      (function() {
        oracledb.getPool('some-random-alias');
      }).should.throw(/^NJS-047:/);

      done();
    });

    it('67.1.11 does not throw an error if multiple pools are created without a poolAlias in the same call stack', function(done) {
      var pool1;
      var pool2;

      async.parallel(
        [
          function(callback) {
            oracledb.createPool(dbConfig, function(err, pool) {
              should.not.exist(err);

              pool1 = pool;

              callback();
            });
          },
          function(callback) {
            oracledb.createPool(dbConfig, function(err, pool) {
              should.not.exist(err);

              pool2 = pool;

              callback();
            });
          }
        ],
        function(createPoolErr) {
          should.not.exist(createPoolErr);

          pool1.close(function(err) {
            should.not.exist(err);

            pool2.close(function(err) {
              should.not.exist(err);

              done(createPoolErr);
            });
          });
        }
      );
    });
  });

  describe('67.2 oracledb.getConnection functional tests', function() {
    it('67.2.1 gets a connection from the default pool when no alias is specified', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        // Not specifying a poolAlias, default will be used
        oracledb.getConnection(function(err, conn) {
          should.not.exist(err);

          conn.release(function(err) {
            should.not.exist(err);

            pool.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.2.2 gets a connection from the pool with the specified poolAlias', function(done) {
      var poolAlias = 'random-pool-alias';

      dbConfig.poolAlias = poolAlias;

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        oracledb.getConnection(poolAlias, function(err, conn) {
          should.not.exist(err);

          conn.release(function(err) {
            should.not.exist(err);

            pool.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.2.3 throws an error if an attempt is made to use the default pool when it does not exist', function(done) {
      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        // Not specifying a poolAlias, default will be used
        oracledb.getConnection(function(err, conn) {
          should.exist(err);

          (err.message).should.startWith('NJS-047:');

          pool.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.2.4 throws an error if an attempt is made to use a poolAlias for a pool that is not in the cache', function(done) {
      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        oracledb.getConnection('pool-alias-that-does-not-exist', function(err, conn) {
          should.exist(err);

          (err.message).should.startWith('NJS-047:');

          pool.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.2.5 gets a connection from the default pool, even after an aliased pool is created', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = 'random-pool-alias';

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          oracledb.getConnection(function(err, conn) {
            should.not.exist(err);

            // Using the hidden pool property to check where the connection came from
            should.strictEqual(pool1, conn._pool);

            (conn._pool.poolAlias).should.equal('default');

            conn.close(function(err) {
              should.not.exist(err);

              pool1.close(function(err){
                should.not.exist(err);

                pool2.close(function(err){
                  should.not.exist(err);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('67.2.6 uses the right pool, even after multiple pools are created', function(done) {
      var aliasToUse = 'random-pool-alias-2';

      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = aliasToUse;

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          dbConfig.poolAlias = 'random-pool-alias-3';

          oracledb.createPool(dbConfig, function(err, pool3) {
            should.not.exist(err);

            oracledb.getConnection(aliasToUse, function(err, conn) {
              // Using the hidden pool property to check where the connection came from
              should.strictEqual(pool2, conn._pool);

              (conn._pool.poolAlias).should.equal(aliasToUse);

              conn.close(function(err) {
                should.not.exist(err);

                pool1.close(function(err){
                  should.not.exist(err);

                  pool2.close(function(err){
                    should.not.exist(err);

                    pool3.close(function(err){
                      should.not.exist(err);

                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});