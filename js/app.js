/**
 * Контроллер Диалога
 * @param $scope
 * @param $http
 * @param $location
 * @param Output
 * @param Slides
 */
function dialogControl ($scope,$http,$location,Output,Slides) {

    setSlide(1);

    //изменяем текущий слайд
    function setSlide(id){
        if(id == null){
            // если номер слайда не задан, отправляем результаты на сервер и выводим таблицу с результатами
            $http.post('api/dialog/results',Output).success(function(data) {
               console.log(data);   // ответ от сервера удет выведен в консоли браузера.
                                    // (серер возвращает обратно переданные POST запросом данные )
            });

            $location.path('results');
        }else{
            //если номер слайда указан, изменяем его
            dialogControl.currentSlideId = id;
            $scope.slide = _.findWhere(Slides,{id: dialogControl.currentSlideId })
        }
    }

    //функция выбор варианта ответа
    $scope.select = function(variantId){
        var currentVariant = _.findWhere($scope.slide.variants,{variantId: variantId });

        //записываем ответ
        Output.results.push({
            "slideId": dialogControl.currentSlideId,
            "variantId": currentVariant.variantId,
            "points": currentVariant.points
        });
        Output.sum += currentVariant.points;
        setSlide(currentVariant.nextId);
    };

}
/**
 * Ждем пока загрузятся данный для слайдов
 */
dialogControl.resolveFn = {
    data : function($http, Slides) {
        if(!Slides.length){
            return $http.get('api/dialog/data.json').success(function(data) {
                _.extend(Slides,data.slides);
            });
        }
    }
};

/**
 * Контроллер результатов
 * @param $scope
 * @param $location
 * @param Output
 * @param Slides
 */
function resultsControl ($scope,$location,Output,Slides) {
    //не даем просмотреть резултаты без прохождения теста
    if (!Output.results.length) {
        $location.path("/");
    }
    //перезапуск программы
    $scope.restart = function(){
        Output.results.length = 0;
        Output.sum = 0;
        $location.path("/");
    };

    $scope.tableData = [];
    $scope.score = Output.sum;

    //подготавливаем данные для таблицы
    _.each(Output.results,function(result){
        var slide =  _.findWhere(Slides,{id: result.slideId });
        var variant = _.findWhere(slide.variants,{variantId: result.variantId });
        $scope.tableData.push({
            text:       variant.text,
            comment:    variant.comment,
            points :    result.points
        });
    });

}

/**
 * коррективрока работы сервиса $http для корректной обработки POST запросов
 * источник: http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/
 * @param $httpProvider
 */
function changeHttpServiceBehavior ($httpProvider)
{
    // Use x-www-form-urlencoded Content-Type
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

    // Override $http service's default transformRequest
    $httpProvider.defaults.transformRequest = [function(data)
    {
        /**
         * The workhorse; converts an object to x-www-form-urlencoded serialization.
         * @param {Object} obj
         * @return {String}
         */
        var param = function(obj)
        {
            var query = '';
            var name, value, fullSubName, subName, subValue, innerObj, i;

            for(name in obj)
            {
                value = obj[name];

                if(value instanceof Array)
                {
                    for(i=0; i<value.length; ++i)
                    {
                        subValue = value[i];
                        fullSubName = name + '[' + i + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value instanceof Object)
                {
                    for(subName in value)
                    {
                        subValue = value[subName];
                        fullSubName = name + '[' + subName + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value !== undefined && value !== null)
                {
                    query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
                }
            }

            return query.length ? query.substr(0, query.length - 1) : query;
        };

        return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
    }];
}


//создаем приложение
angular
    .module('project', ["ngRoute"], changeHttpServiceBehavior)
    .config(function($routeProvider) {
        $routeProvider
            //страница с вопросами
            .when('/', {
                controller:'dialogControl',
                templateUrl:'views/variants.html',
                resolve: dialogControl.resolveFn
            })
            //страница с результатами
            .when('/results', {
                controller:'resultsControl',
                templateUrl:'views/results.html'
            })
            .otherwise({
                redirectTo:'/'
            });
    }).factory('Output', function() {
        return {
            results: [],
            sum: 0
        };
    }).factory('Slides', function() {
        return [];
    })
    .controller('dialogControl', dialogControl )
    .controller('resultsControl', resultsControl );


