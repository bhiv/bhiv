var async = require('async');

module.exports = new function () {

  var NSBU = this;

  this.iter = function (structure, scope, iterator, accu) {
    var pool = [structure];
    while (pool.length > 0) {
      var item = pool.shift();
      if (item.layouts != null)
        for (var i = 0; i < item.layouts.length; i++)
          if (scope[item.layouts[i]] != null)
            pool.push(scope[item.layouts[i]]);
      accu = iterator(item, accu);
    }
    return accu;
  };

  this.listTags = function (structure, scope) {
    return NSBU.iter(structure, structure, function (item, accu) {
      if (item.tags) Array.prototype.push.apply(accu, item.tags);
      return accu;
    }, []);
  };

  this.get = function (filter, structure, scope) {
    return NSBU.iter(structure, scope, function (child, accu) {
      if (child.children == null) return accu;
      var children = {};
      if (filter.child != null) {
        if (!(filter.child in accu))
          if (filter.child in child.children)
            children[filter.child] = child;
      } else {
        children = item.children;
      }
      if (filter.tags != null && filter.tags.length > 0) {
        child: for (var name in children) {
          var structure = scope[children[name].children[name]];
          var tags = NSBU.listTags(structure, scope);
          for (var i = 0; i < filter.tags.length; i++)
            if (!~tags.indexOf(filter.tags[i]))
              continue child;
          accu[name] = children[name];
        }
      } else {
        for (var name in children)
          accu[name] = children[name];
      }
      if ('Flow' in accu) {
        if (accu.__Flow__)
          delete accu.__Flow__;
      } else if (!('__Flow__' in accu)) {
        if (child.children.Flow != null)
          accu.__Flow__ = child;
      }
      return accu;
    }, {});
  };

  this.replace = function replace(scope, node, filter, modifier, callback) {
    var flow = null;
    var children = NSBU.get(filter[0], node, scope);
    var tasks = [];
    for (var name in children) {
      if (name != '__Flow__') {
        tasks.push({ key: children[name].children[name], name: name, filter: filter.slice(1) });
      } else {
        tasks.push({ key: children[name].children.Flow, name: 'Flow', filter: filter.slice(0) });
      }
    }
    return async.map(tasks, function (task, cb) {
      var child = scope[task.key];
      if (task.filter.length > 0) {
        return replace(scope, child, task.filter, modifier, function (err, child) {
          if (err) return callback(err);
          task.child = child._fqn;
          return cb(null, task);
        });
      } else {
        return modifier(child, function (err, fqn) {
          if (err) return cb(err);
          if (fqn == null) task.child = task.key;
          else task.child = fqn;
          return cb(null, task);
        });
      }
    }, function (err, tasks) {
      if (err) return callback(err);
      var newnode = new Yolo.Structure();
      newnode.children = {};
      if (node._fqn == null) Yolo.Node.fqn(node);
      newnode.layouts = [node._fqn];
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].key == tasks[i].child) continue ;
        newnode.children[tasks[i].name] = tasks[i].child;
      }
      for (var hasChangement in newnode.children) break ;
      if (hasChangement != null) {
        var fqn = Yolo.Node.fqn(newnode);
        scope[fqn] = newnode;
        scope[node._fqn] = node;
        return callback(null, newnode);
      } else {
        return callback(null, node);
      }
    });
  };

};