// 환경설정
// express 프레임워크, bodyparser 라이브러리, mongodb 연결, ejs 엔진
// method-override 라이브러리, dotenv라이브러리, public 폴더,
// passport/passport-local/express-session 라이브러리, multer 라이브러리, socket.io 라이브러리, 

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));

const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

require('dotenv').config()

app.use('/public', express.static('public'));

let multer = require('multer');
var storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, './public/image')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname)
    }
})

var upload = multer({storage : storage});

const http = require('http').Server(app);
const io = require('socket.io')(http); 

var db;
MongoClient.connect(process.env.DB_URL, function(에러, client){   
    if (에러) return console.log(에러)
    db = client.db('todoapp');
    http.listen(process.env.PORT, function(){    
        console.log('listening on 8080')
    });    
});



// -----------------------------------------------------------------------------------------------------------------------

// 홈화면 렌더링
app.get('/', function(req, res){
    res.render('index.ejs');
});

// 누군가가 /pet으로 방문하면, pet과 관련된 안내문을 띄워주자
app.get('/pet', function(요청, 응답){
    응답.send('펫용품쇼핑할 수 있는 사이트입니다.');
});

// 누군가가 /beauty로 방문하면, beauty와 관련된 안내문 띄워주기
app.get('/beauty', (req, res) => {
    res.send('뷰티용품 쇼핑 페이지임.');
});

// /write로 방문하면, writeform 화면 띄워주기
app.get('/write', function(req, res){
    res.render('write.ejs');
});

// /add경로로 POST 요청을 하면, 그 내용을 DB 폴더에 저장
app.post('/add', function(req, res){
    
    // /write에서 글 작성 후 사용자에게 보여줄 부분
    res.send('전송완료')

    // 글번호를 붙혀서 post collection에 작성한 내용을 저장하는 부분
    db.collection('counter').findOne({name : '게시물갯수'}, function(에러, 결과){
        
        // counter collection의 totalPost를 가져와서, 
        console.log(결과.totalPost);
        var 총게시물갯수 = 결과.totalPost;

        // 그걸로 id를 지정하고, POST 요청의 내용들을 post collection에 저장하는 부분
        db.collection('post').insertOne({_id : 총게시물갯수 + 1, 제목 : req.body.title, 날짜 : req.body.date}, function(에러, 결과){
            // console.log(req.body.title)
            // console.log(req.body.date)
            console.log('post폴더에 저장완료');

            // 작성한 내용 저장 후 counter collection에 있는 totalPost의 항목을 '1'만큼 증가시킴
            db.collection('counter').updateOne({name:'게시물갯수'}, { $inc : {totalPost:1} }, function(에러, 결과){
                if (에러) {return console.log(에러)}
            });
        });

    });
    
});

// /list로 접속하면, 실제 DB에 저장된 데이터들을 예쁘게 꾸며진 HTML로 보여줌
app.get('/list', function(req, res){
    
    // DB post collection에 저장된 모든 데이터를 가져오는 부분
    db.collection('post').find().toArray(function(에러, 결과){
        if (에러) return console.log(에러)
        console.log(결과);
        // 그 후 posts라는 이름으로 그 데이터들을 list.ejs로 전달하고, list.ejs를 렌더링하는 부분
        res.render('list.ejs', { posts : 결과});
    });
    
});

// ajax를 통해 DELETE 요청이 오면, 수행할 기능
app.delete('/delete', function(요청, 응답){
    
    console.log(요청.body)
    
    // 요청받은 게시물번호의 데이터타입을 문자가 아닌 int로 바꿔주는 부분
    요청.body._id = parseInt(요청.body._id);
    
    // 요청받은 게시물번호를 가진 글을 찾아, 해당 글을 삭제하는 부분
    db.collection('post').deleteOne(요청.body, function(에러, 결과){
        console.log('삭제완료');
        응답.status(200).send({ message : '성공했습니다' });
    });

});

// /detail로 접속하면 detail.ejs를 렌더링
app.get('/detail/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        // 응답.status(400).render('404.ejs');
        if (에러) {return 응답.render('404.ejs')}
        console.log(결과);
        응답.render('detail.ejs', { data : 결과 });
    })
});

// 수정버튼을 눌러 /edit으로 접속하면 작성한 글을 편집할 수 있는 기능 넣기
app.get('/edit/:id', function(요청, 응답){
    db.collection('post').findOne({_id : parseInt(요청.params.id)}, function(에러, 결과){
        console.log(결과);
        응답.render('edit.ejs', { post : 결과});
    })
});

// 수정페이지에서 수정완료버튼을 눌러 PUT요청을 하면, 해당 글 내용 수정해서 DB에 저장하기
app.put('/edit', function(요청, 응답){
    db.collection('post').updateOne({_id : parseInt(요청.body.id)}, { $set : {제목:요청.body.title, 날짜:요청.body.date}},function(에러, 결과){
        console.log('수정완료')
        응답.redirect('/list')
    })
});

// /login으로 접속하면, 로그인 페이지 라우팅하기
app.get('/login', function(요청, 응답){
    응답.render('login.ejs');
});

// 로그인 페이지에서 아이디, 패스워드 입력 후 POST요청을 보내면, 해당 아이디, 패스워드로 로그인시키는 기능
app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), function(요청, 응답){
    응답.redirect('/')
});

// 로그인 성공 시에만 사용할 수 있는 마이페이지 라우팅
app.get('/mypage', 로그인했니 ,function(요청, 응답){
    console.log(요청.user);
    응답.render('mypage.ejs', {사용자 : 요청.user});
});

function 로그인했니(요청, 응답, next){
    if (요청.user){
        next()
    }else{
        응답.send('로그인안하셨는데요')
    }
}

// 로그인 실패 시 404 페이지 라우팅하기
app.get('/fail', function(요청, 응답){
    응답.render('404.ejs');
});

// 로그인 시 회원검사를 하는 middleware
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (입력한아이디, 입력한비번, done) {
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
      if (에러) return done(에러)
      if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
      if (입력한비번 == 결과.pw) {
        return done(null, 결과)
      } else {
        return done(null, false, { message: '비번틀렸어요' })
      }
    })
  }));

// 로그인이 잘 되었을 때, id를 이용해서 세션을 저장시키는 부분
passport.serializeUser(function(user, done){
    done(null, user.id)
});

// 마이페이지 접속 시 발동, 해당 세션 데이터를 가진 사람을 DB에서 찾기, 찾았다면 그 정보를 전달
passport.deserializeUser(function(아이디, done){
    // DB에서 위에 있는 user.id로 유저를 찾은 뒤 유저정보를 done 안에 전달함
    db.collection('login').findOne({id : 아이디}, function(에러, 결과){
        done(null, 결과)
    })
});

// '/shop'경로로 접속했을 때, shop.js로 만들어진 라우터 적용
app.use('/shop', require('./routes/shop.js'));

// '/board/sub'경로로 접속했을 때, board.js로 만들어진 라우터 적용
app.use('/board/sub', require('./routes/board.js'));

// /upload로 GET요청을 보내면 업로드페이지로 라우팅
app.get('/upload', function(요청, 응답){
    응답.render('upload.ejs')
});

// /upload로 POST요청을 보내면 업로드한 이미지를 폴더안에 저장 (multer 라이브러리 사용)
app.post('/upload', upload.single('프로필') ,function(요청, 응답){
    응답.send('업로드완료')
});

// 특정 이미지를 요구하면 이미지를 보여주는 기능
app.get('/image/:imageName', function(요청, 응답){
    응답.sendFile(__dirname + '/public/image/' + 요청.params.imageName)
})

// /chat으로 접속하면 chat.ejs 파일을 보여주는 부분
app.get('/chat', function(요청, 응답){
    응답.render('chat.ejs');
});

// web socket으로 통신하는 부분
io.on('connection', function(socket){
    console.log('연결되었어요');

    // 클라이언트가 인삿말이라는 이름으로 보낸 소켓을 1)콘솔창에 보여주고 
    socket.on('인삿말', function(data){
        console.log(data);
        // 2)다시 클라이언트에게 퍼트리기라는 이름으로 데이터 전달
        io.emit('퍼트리기', data);
    });
});

// 채팅방1로 채팅하는 부분
var chat1 = io.of('/채팅방1');
chat1.on('connection', function(socket){

    var 방번호 = ' ';

    // 방버튼으로 접속요청하면 접속시켜주는 부분
    socket.on('방으로들어가고싶음', function(data){
        console.log(data)
        socket.join(data);
        방번호 = data;
    })

    // 클라이언트가 인삿말이라는 이름으로 보낸 소켓을 1)콘솔창에 보여주고 
    socket.on('인삿말', function(data){
        console.log(data);
        // 2)다시 클라이언트에게 퍼트리기라는 이름으로 데이터 전달
        chat1.to(방번호).emit('퍼트리기', data);
    });

});

