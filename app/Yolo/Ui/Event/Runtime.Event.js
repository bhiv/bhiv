module.exports = new function () {

  this.Event = new function () {

    this.wrapInlet = function (inlet) {
      try { var fn = new Function('node,dom,data,e', inlet.source); }
      catch (e) { return inlet.event.reply(Yolo.Util.wrapError(e, inlet.source)); }
      switch (inlet.event) {
      case 'submit':
        bindForm(inlet);
        var wrapper = makeSubmitWrapper(inlet, fn);
        inlet.node.set('custom_submit', true);
        jQuery(inlet.node.get('dom')).on(inlet.event, inlet.selector, wrapper);
        break ;
      case 'validate': case 'done': case 'fail':
        bindForm(inlet);
        /* no break */
      default:
        jQuery(inlet.node.get('dom')).on(inlet.event, inlet.selector, function (e, data) {
          return fn.call(inlet, inlet.node, this, data, e);
        });
        break ;
      }
    };

    var makeSubmitWrapper = function (inlet, fn) {
      return function (e, data) {
        if (data == null) data = e.__yolo_session;
        if (data == null) data = { failed: false };
        e.__yolo_session = data;
        data.dom = this;
        if (this.nodeName == 'FORM' && !('value' in data)) {
          data.action = this.action || null;
          data.method = this.method;
          data.headers = {};
          if (e.target.enctype) data.headers['Content-Type'] = this.enctype;
          data.value = jQuery(this).getFormData();
        }
        if (data.failed && e.type == 'submit') return ;
        return fn.call(inlet, inlet.node, this, data, e);
      };
    };

    var bindForm = function (inlet) {
      var dom = inlet.node.get('dom')
      if (dom.formBinded == null) dom.formBinded = {};
      if (dom.formBinded[inlet.selector]) return ;
      dom.formBinded[inlet.selector] = true;
      jQuery(dom).on('submit', inlet.selector, makeSubmitWrapper(inlet, function (node, dom, data, e) {
        var $form = jQuery(dom);
        if ($form.hasClass('locked')) return ;
        data.event = e;
        data.failWith = function (msg) {
          data.failed = true;
          data.event.preventDefault();
          $form.trigger('unlock');
          $form.trigger('fail', { message: msg });
        };
        data.asyncs = 0;
        data.addAsync = function () {
          data.asyncs += 1;
          var done = false;
          return function (err) {
            if (err) {
              if (typeof err == 'string') err = Yolo.Util.wrapError(err);
              error(err, err.message);
            }
            if (done) return ;
            done = true;
            data.asyncs -= 1;
            if (err || data.asyncs > 0 || data.failed) {
              return data.event.preventDefault();
            } else {
              return then();
            }
          };
        };
        $form.trigger('lock');
        var success = function (result) {
          $form.trigger('unlock');
          data.result = result;
          $form.trigger('done', data);
        };
        var error = function (error, msg) {
          var payload = { message: msg };
          $form.trigger('unlock');
          if (!(error instanceof Error) && error.responseText) {
            payload.xhr = error;
            if ((error.getAllResponseHeaders() + '').indexOf('application/json') >= 0) {
              var result = JSON.parse(error.responseText);
              if (result.message) payload.message = result.message;
            }
            if (payload.message == 'error') payload.message = 'XHR failed';
          } else {
            payload.error = error;
          }
          $form.trigger('fail', payload);
        };
        var then = function () {
          if ($(data.dom).is('[x-native]')) return /* do not preventDefault */;
          data.event.preventDefault();
          if (!inlet.node.get('custom_submit')) {
            return $.ajax({ url: data.action, type: data.method, data: data.value
                          , success: success, error: error
                          });
          }
        };
        var unlock = data.addAsync();
        $form.trigger('validate', data);
        data.addAsync = null;
        unlock();
        return ;
      }));
      jQuery(dom).on('lock', inlet.selector, function (e) { jQuery(this).addClass('locked'); });
      jQuery(dom).on('unlock', inlet.selector, function (e) { jQuery(this).removeClass('locked'); });
    };



  };

};