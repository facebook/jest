/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {HasteFS} from 'types/HasteMap';
import type {Path} from 'types/Config';
import type {
  Resolver,
  ResolveModuleConfig,
  ResolvedModule,
} from 'types/Resolve';
import type {SnapshotResolver} from 'types/SnapshotResolver';
import {isSnapshotPath} from 'jest-snapshot';

/**
 * DependencyResolver is used to resolve the direct dependencies of a module or
 * to retrieve a list of all transitive inverse dependencies.
 */
class DependencyResolver {
  _hasteFS: HasteFS;
  _resolver: Resolver;
  _snapshotResolver: SnapshotResolver;

  constructor(
    resolver: Resolver,
    hasteFS: HasteFS,
    snapshotResolver: SnapshotResolver,
  ) {
    this._resolver = resolver;
    this._hasteFS = hasteFS;
    this._snapshotResolver = snapshotResolver;
  }

  resolve(file: Path, options?: ResolveModuleConfig): Array<Path> {
    const dependencies = this._hasteFS.getDependencies(file);
    if (!dependencies) {
      return [];
    }

    return dependencies.reduce((acc, dependency) => {
      if (this._resolver.isCoreModule(dependency)) {
        return acc;
      }
      let resolvedDependency;
      try {
        resolvedDependency = this._resolver.resolveModule(
          file,
          dependency,
          options,
        );
      } catch (e) {
        resolvedDependency = this._resolver.getMockModule(file, dependency);
      }

      if (resolvedDependency) {
        acc.push(resolvedDependency);
      }

      return acc;
    }, []);
  }

  resolveInverseModuleMap(
    paths: Set<Path>,
    filter: (file: Path) => boolean,
    options?: ResolveModuleConfig,
  ): Array<ResolvedModule> {
    if (!paths.size) {
      return [];
    }

    const collectModules = (related, moduleMap, changed) => {
      const visitedModules = new Set();
      const result: Array<ResolvedModule> = [];
      while (changed.size) {
        changed = new Set(
          moduleMap.reduce((acc, module) => {
            if (
              visitedModules.has(module.file) ||
              !module.dependencies.some(dep => dep && changed.has(dep))
            ) {
              return acc;
            }

            const file = module.file;
            if (filter(file)) {
              result.push(module);
              related.delete(file);
            }
            visitedModules.add(file);
            acc.push(module.file);
            return acc;
          }, []),
        );
      }
      return result.concat(Array.from(related).map(file => ({file})));
    };

    const relatedPaths = new Set<Path>();
    const changed = new Set();
    for (const path of paths) {
      if (this._hasteFS.exists(path)) {
        const modulePath = isSnapshotPath(path)
          ? this._snapshotResolver.resolveTestPath(path)
          : path;
        changed.add(modulePath);
        if (filter(modulePath)) {
          relatedPaths.add(modulePath);
        }
      }
    }
    const modules = [];
    for (const file of this._hasteFS.getAbsoluteFileIterator()) {
      modules.push({
        dependencies: this.resolve(file, options),
        file,
      });
    }
    return collectModules(relatedPaths, modules, changed);
  }

  resolveInverse(
    paths: Set<Path>,
    filter: (file: Path) => boolean,
    options?: ResolveModuleConfig,
  ): Array<Path> {
    return this.resolveInverseModuleMap(paths, filter, options).map(
      module => module.file,
    );
  }
}

module.exports = DependencyResolver;
