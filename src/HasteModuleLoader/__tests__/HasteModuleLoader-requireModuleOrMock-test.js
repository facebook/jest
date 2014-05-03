'use strict';

require('jest-runtime').autoMockOff();

var path = require('path');
var q = require('q');

describe('nodeHasteModuleLoader', function() {
  var genMockFn;
  var HasteModuleLoader;
  var mockEnvironment;
  var resourceMap;

  var CONFIG = {
    projectName: 'nodeHasteModuleLoader-tests',
    testPathDirs: [path.resolve(__dirname, 'test_root')]
  };

  function buildLoader(config) {
    config = config || CONFIG;
    if (!resourceMap) {
      return HasteModuleLoader.loadResourceMap(config).then(function(map) {
        resourceMap = map;
        return buildLoader(config);
      });
    } else {
      return q(new HasteModuleLoader(config, mockEnvironment, resourceMap));
    }
  }

  beforeEach(function() {
    genMockFn = require('jest-runtime').genMockFn;
    HasteModuleLoader = require('../HasteModuleLoader');

    mockEnvironment = {
      global: {
        console: {},
        mockClearTimers: genMockFn()
      },
      runSourceText: genMockFn().mockImplementation(function(codeStr) {
        /* jshint evil:true */
        return (new Function('return ' + codeStr))();
      })
    };
  });

  describe('requireModuleOrMock', function() {
    pit('mocks modules by default', function() {
      return buildLoader().then(function(loader) {
        var exports = loader.requireModuleOrMock(null, 'RegularModule');
        expect(exports.setModuleStateValue._isMockFunction).toBe(true);
      });
    });

    pit('doesnt mock modules when explicitly dontMock()ed', function() {
      return buildLoader().then(function(loader) {
        loader.requireModuleOrMock(null, 'jest-runtime')
          .dontMock('RegularModule');
        var exports = loader.requireModuleOrMock(null, 'RegularModule');
        expect(exports.isRealModule).toBe(true);
      });
    });

    pit('doesnt mock modules when explicitly dontMock()ed via a different ' +
        'denormalized module name', function() {
      return buildLoader().then(function(loader) {
        loader.requireModuleOrMock(__filename, 'jest-runtime')
          .dontMock('./test_root/RegularModule');
        var exports = loader.requireModuleOrMock(__filename, 'RegularModule');
        expect(exports.isRealModule).toBe(true);
      });
    });

    pit('doesnt mock modules when autoMockOff() has been called', function() {
      return buildLoader().then(function(loader) {
        loader.requireModuleOrMock(null, 'jest-runtime').autoMockOff();
        var exports = loader.requireModuleOrMock(null, 'RegularModule');
        expect(exports.isRealModule).toBe(true);
      });
    });

    pit('uses manual mock when automocking on and mock is avail', function() {
      return buildLoader().then(function(loader) {
        var exports = loader.requireModuleOrMock(null, 'ManuallyMocked');
        expect(exports.isManualMockModule).toBe(true);
      });
    });

    pit('does not use manual mock when automocking is off and a real ' +
        'module is available', function() {
      return buildLoader().then(function(loader) {
        loader.requireModuleOrMock(__filename, 'jest-runtime').autoMockOff();
        var exports = loader.requireModuleOrMock(__filename, 'ManuallyMocked');
        expect(exports.isManualMockModule).toBe(false);
      });
    });
  });
});
