(function () {
    var template = function (templateName, data) {
        return renderFile(templateName, data);
    };

    var defaults = template.defaults = {
        openTag: '<%',    // 逻辑语法开始标签
        closeTag: '%>',   // 逻辑语法结束标签
        //escape: true,     // 是否编码输出变量的 HTML 字符
        cache: true      // 是否开启缓存（依赖 options 的 filename 字段）
    };

    var cacheStore = template.cache = {};

    var renderFile = function (templateName, data) {
        var render = template.get(templateName);
        return render(data);
    };

    template.get = function (templateName) {
        var cache;
        if (defaults.cache && cacheStore[templateName]) {
            cache = cacheStore[templateName];
        } else if (typeof document === 'object') {
            // 加载模板并编译
            var elem = document.getElementById(templateName);
            if (elem) {
                var source = elem.innerHTML;
                cache = compile(source);
                if (templateName && defaults.cache) {
                    cacheStore[templateName] = cache;
                }
            }
        }
        return cache;
    };

    var compile = template.compile = function (source, options) {
        var options = extend(options, defaults);
        var render = compiler(source, options);
        return render;
    };

    var compiler = function (source, options) {
        var openTag = options.openTag;
        var closeTag = options.closeTag;
        var cache = options.cache;

        //此处开始解析模板，并生成渲染函数
        var headerCode = "'use strict';" + "\n" + "var ";
        var mainCode = "$out='';";
        var footerCode = "return new String($out);";

        var uniq = {};
        var html = function (code) {
            if (code) {
                code = "$out+=" + stringify(code) + ";" + "\n";
            }
            return code;
        };

        var logic = function (code) {
            // 输出语句. 编码: <%=value%> 不编码:<%=#value%>
            if (code.indexOf('=') === 0) {
                code = code.replace(/^=[=#]?|[\s;]*$/g, '');
                code = "$out+=" + code + ";";
            }


            // 提取模板中的变量名
            each(getVariable(code), function (name) {

                // name 值可能为空，在安卓低版本浏览器下
                if (!name || uniq[name]) {
                    return;
                }

                var value;
                // 声明模板变量
                value = "$data." + name;
                headerCode += name + "=" + value + ",";
                uniq[name] = true;

            });

            return code + "\n";
        };


        each(source.split(closeTag), function (code) {
            //此时代码已被截取成两部分，一部分是纯html，
            //一部分是逻辑代码，即是包含在html<%logic%>html里面的部分
            code = code.split(openTag);
            var htmlStr = code[0];

            var logicStr = code[1];

            mainCode += html(htmlStr);

            if (code.length > 1 && logicStr) {

                mainCode += logic(logicStr);
            }
        });

        var code = headerCode + mainCode + footerCode;
        try {
            var Render = new Function("$data", code);
            return Render;

        } catch (e) {
            e.temp = "function anonymous($data) {" + code + "}";
            throw e;
        }

    };


    // 静态分析模板变量
    var KEYWORDS =
        // 关键字
        'break,case,catch,continue,debugger,default,delete,do,else,false'
        + ',finally,for,function,if,in,instanceof,new,null,return,switch,this'
        + ',throw,true,try,typeof,var,void,while,with'

            // 保留字
        + ',abstract,boolean,byte,char,class,const,double,enum,export,extends'
        + ',final,float,goto,implements,import,int,interface,long,native'
        + ',package,private,protected,public,short,static,super,synchronized'
        + ',throws,transient,volatile'

            // ECMA 5 - use strict
        + ',arguments,let,yield'

        + ',undefined';

    var REMOVE_RE = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|\s*\.\s*[$\w\.]+/g;
    var SPLIT_RE = /[^\w$]+/g;
    var KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g');
    var NUMBER_RE = /^\d[^,]*|,\d[^,]*/g;
    var BOUNDARY_RE = /^,+|,+$/g;
    var SPLIT2_RE = /^$|,+/;


    // 获取变量
    function getVariable(code) {
        return code
            .replace(REMOVE_RE, '')
            .replace(SPLIT_RE, ',')
            .replace(KEYWORDS_RE, '')
            .replace(NUMBER_RE, '')
            .replace(BOUNDARY_RE, '')
            .split(SPLIT2_RE);
    };


    /**
     *  合并默认配置
     * @param options
     * @param defaultsOptions
     */
    var extend = function (options, defaultsOptions) {
        options = options || {};
        for (var name in defaultsOptions) {
            if (options[name] === undefined && defaultsOptions.hasOwnProperty(name)) {
                options[name] = defaultsOptions[name];
            }
        }
        return options;
    };

    var isArray = Array.isArray || function (obj) {
            return ({}).toString.call(obj) === '[object Array]';
        };


    var each = function (data, callback) {
        var i, len;
        if (isArray(data)) {
            for (i = 0, len = data.length; i < len; i++) {
                callback.call(data, data[i], i, data);
            }
        } else {
            for (i in data) {
                callback.call(data, data[i], i);
            }
        }
    };

    // 字符串转义
    function stringify(code) {
        return "'" + code
                // 单引号与反斜杠转义
                .replace(/('|\\)/g, '\\$1')
                // 换行符转义(windows + linux)
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n') + "'";
    }


    this.template = template;
})();


