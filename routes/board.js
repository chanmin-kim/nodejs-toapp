var router = require('express').Router();


router.get('/sports', function(요청, 응답){
    응답.send('스포츠 관련 페이지입니다');
});

router.get('/game', function(요청, 응답){
    응답.send('게임 관련 페이지입니다');
});

module.exports = router;