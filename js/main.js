$("html").ready(function(){



// IN DOING ::: Create new targetContact



/*

	Gestion des tirs 

	- Position du shoot
	- Déplacement de la balle

	- Impact alert ( call autre fonction )


	Gestion du click 

	- Temps entre les tirs
	- Position du click

	- Créer une balle + lancer balle


	Gestion Impact

	- Vérifier si, la zone de contact et la balle se touche
	- Effacer les balles

	- Si impacte > ajout de point


	Gestion zone de contact 

	- Différents type de zone de contacts

		- Taille ( varient )
		- Déplacement / type ( fixe ou mouvement )
		- Impacte sur Target ( recule ) varie taille & type
			+ petit = + impact 
			mouvement = + impact




	Gestion mouvement de la Target

	- Descend tout les X temps de X pourcent
	- Remonte de X pourcent lorsqu'une zone de contact est détruite selon son imapcte


	Gestion impacte |e| Target & Safe-Zone


*/







	//
	////
	////////
	////////////     Vars
	/////////
	////
	//

	var shoots = new Array(),
		lastShootTime = 0,
		target = new Object,
		game = new Object,
		targetContact = new Object,
		targetContactType = new Array(),

		docHeight = $(document).height()

		bonus = new Array(),
		bonusSelectedId = 'none',
		bonusFalling = new Array(),
		bonusFallingHitCheckRefresh = new Array();
		bonusFallingHitCheckRefresh['max'] = 10;
		bonusFallingHitCheckRefresh['actual'] = 0;


		$safeZone = $("#safe-zone"),
		$score = $("#game-info .in-game .score p, #game-info td.score "),
		$time = $("#game-info .in-game .time p, #game-info td.time"),
		$level = $("#game-info .in-game .level p, #game-info td.level"),
		$shootContainer = $("#shoot-container"),
		$target = $("#target"),
		$weaponsBtn = $("#weapons .weapon-btn"),
		$weaponFreeze = $("#weapons #weapon-freeze span"),
		$weaponGoBack = $("#weapons #weapon-goBack span"),

		safeZoneHammer = Hammer(document.getElementById("safe-zone"));



	game.running = false
	game.refresh = 1000 / 35
	game.interval = '';
	game.level = 1
	game.score = 0
	game.time = 0
	game.ms = 0

	target.selector = $("#target");
	target.height = 0
	target.lastTouch = 0;
	target.initHeight = $target.height();
	target.freeze = 0;
	target.distance = parseInt( $(document).height() - target.initHeight - $safeZone.height() )
	target.step = 10
	target.stepHeight = parseInt( target.distance / target.step );


	bonus.push('freeze', 'goBack')

	var bonusTable = new Array();

	for(i=0;i<bonus.length;i++){

		var bonusName = bonus[i];
		bonus[i] = new Object;
		bonus[i].name = bonusName;
		bonus[i].id = i;
		bonus[i].number = 0;

		bonusTable[bonusName] = bonus[i].id;

		$('#weapons #weapon-'+bonus[i].name).attr('data-weapon_id',i)

	}


	var bonusChanceFreeze = Array();
		
	bonusChanceFreeze['chanceMax'] = 5;
	bonusChanceFreeze['intervalTotal'] = 20;
	bonusChanceFreeze['interval'] = 0;
	bonusChanceFreeze['winNumber'] = 1;




	//
	////
	////////
	////////////     LISTENERS
	/////////
	////
	//

	safeZoneHammer.on('tap', function(e){		

		if(game.running == false){
			startGame();
			game.running = true;
		}

		var x = e.pointers[0].clientX,
			y = e.pointers[0].clientY;			

		createShoot(x,y);

	})

	$('.game-init a').click(function(e){

		e.preventDefault();
		startGame();
		game.running = true;

		$('.game-init').addClass("hide");

	})


	$(".restart-game").click(function(){


		target.lastTouch = 0;
		game.running = false
		game.refresh=50
		game.interval = '';
		game.level = 1
		game.score = 0
		game.time = 0
		target.height = 0;

		bonus[bonusTable['freeze']].number=0;
		bonus[bonusTable['goBack']].number=0;

		bonusFalling = [];

		$("#bonus-container").empty();

		$shootContainer.empty();




		refreshView();	

		$time.text(msToTime(game.time));

		setTimeout(function(){
			$(".end").removeClass("show");
			// target.selector.css('height', '75px');
		}, 1200);
		setTimeout(function(){			
			$("#game-info .in-game").show();
			startGame();
			game.running = true;
		}, 1800);
		



	})


	$("#weapons .weapon-btn").click(function(e){

		var $this = $(this);


		if($this.hasClass('selected')){

			$weaponsBtn.removeClass("selected");
			bonusSelectedId = 'none';

		}else{

			$weaponsBtn.removeClass("selected");

			if(bonus[$this.data('weapon_id')].number>0){
			
				$this.addClass("selected")
				bonusSelectedId = bonus[$this.data('weapon_id')].id

			}

		}


	})




	//
	////
	////////
	////////////     FUNCTIONS
	/////////
	////
	//



	/////
	////////     Game Functions
	/////


	function startGame(){
	
		initTargetContact();


		game.interval = setInterval(function(){
				
			increaseTimer();
			updateTargetPosition();
			levelController();

			// bonusChance();
			// updateBonusPosition();
			// bonusFallingHitCheck();

			if (shoots.length>0) {


				updateShootPosition();

			}

		},game.refresh)


	}

	function gameLoose(){
		clearInterval(game.interval);
		setCssTranslate(target.selector, 0, 0)
		$("#game-info .in-game").hide();
		$(".end").addClass('show');
		$weaponsBtn.addClass("hide");

		$target.empty();
		$shootContainer.empty();
		bonusFalling = [];
		$("#bonus-container").empty();
	}

	function increaseTimer(){
		game.time = parseInt(game.time + game.refresh) ;
		game.ms += 1;
		$time.text(msToTime(game.time));
	}

	function levelController(){
		if(game.score==10){
			game.level = 2;
			refreshViewLevel();
		}else if(game.score==25){
			game.level = 3;
			refreshViewLevel();
		}else if(game.score==50){
			game.level = 4;
			refreshViewLevel();
		}else if(game.score==80){
			game.level = 5;
			refreshViewLevel();
		}
	}



	/////
	////////     Init Functions
	/////


	function initTargetContact(){

		var docWidth = $(document).width();

		targetContact.speed = 0;

		if(game.level == 1){
			targetContact.widthPourcentage = 0.35;
		}else if(game.level == 2){
			targetContact.widthPourcentage =  (Math.floor( Math.random() * 35 ) + 25) / 100;
		}else if(game.level == 3){
			targetContact.widthPourcentage =  (Math.floor( Math.random() * 8 ) + 13) / 100;
		}else if(game.level == 4){
			targetContact.widthPourcentage =  (Math.floor( Math.random() * 4 ) + 5) / 100;
		}else if(game.level >= 5){
			targetContact.widthPourcentage =  (Math.floor( Math.random() * 4 ) + 5) / 100;
		}

		targetContact.width = parseInt(docWidth*targetContact.widthPourcentage);

		targetContact.x = Math.floor( Math.random() * parseInt(docWidth - targetContact.width));
		targetContact.life = 3;
		targetContact.point = 1;



		targetContact.selector = $('<div class="contact-zone" style="width:'+targetContact.width+'px" />').appendTo("#target");


		setCssTranslate(targetContact.selector, targetContact.x, 0);


	}


	function createShoot(posX, posY){


		if(game.time - lastShootTime > 300){

			var new_shoot = new Object();

			
			new_shoot.selector = $('<div class="shoot alpha" />').appendTo("#shoot-container");
			new_shoot.x = posX;
			new_shoot.y = posY;
			new_shoot.translateY = 0;
			new_shoot.translateX = 0;
			new_shoot.width = 'normal';
			new_shoot.speed = 35;
			new_shoot.passed = false;
			new_shoot.strength = 1;
			new_shoot.freeze = 0;
			new_shoot.goBack = 0;
			

			if(bonusSelectedId != 'none'){			

				bonus[bonusSelectedId].number = parseInt(bonus[bonusSelectedId].number-1);
				$weaponsBtn.removeClass("selected");

				if(bonus[bonusSelectedId].id == bonusTable['freeze']) {
					new_shoot.freeze = 1;

				}else if(bonus[bonusSelectedId].id == bonusTable['goBack']) {
					new_shoot.goBack = 1;
				}


				bonusSelectedId = 'none';
				refreshView();

			}


			new_shoot.selector.css({
				'top':new_shoot.y+'px',
				'left':new_shoot.x+'px'
			})

			shoots[shoots.length] = new_shoot;
			lastShootTime = game.time;

		}

	}



	function bonusCreateFreeze(){

		bonusF = new Object;

		bonusF.selector = $('<div class="bonus bonus-freeze" />').appendTo("#bonus-container")
		bonusF.type = "freeze";
		bonusF.translateY = 0;
		bonusF.translateX = 0;
		bonusF.width = 80;
		bonusF.height = 80;
		bonusF.x = Math.floor(parseInt( (bonusF.width/2) + ( ($(document).width() - bonusF.width) * Math.random() ) ))
		bonusF.y = 80;
		bonusF.passed = false;
		bonusF.lastTranslateY = 0;
		bonusF.id = game.ms+"_"+bonusF.x;
		bonusF.passed = false;

		bonusF.selector.css({
			'top':bonusF.y+'px',
			'left':bonusF.x+'px'
		})


		bonusFalling[bonusF.id] = bonusF;

		
	}


	function bonusChance(){

		bonusChanceFreezeCheck();

	}


	function bonusChanceFreezeCheck(){


		if(bonusChanceFreeze['interval'] >= bonusChanceFreeze['intervalTotal']){

			bonusChanceFreeze['interval'] = 0;

			if( bonusChanceFreeze['winNumber'] == (Math.floor(Math.random() * bonusChanceFreeze['chanceMax'])) ){
				
				bonusCreateFreeze();

			}


		}else{			
			bonusChanceFreeze['interval'] = parseInt(bonusChanceFreeze['interval'] + 1)			
		}

	}
	

	function bonusAdd(){


		var bonusRandomId = Math.floor(Math.random() * ( bonus.length  )  );


		bonus[bonusRandomId].number += 1;


	}



	$(window).keypress(function(e){
		
		
		if(e.keyCode == 32){
			bonus[0].number += 1;
			$("#weapons #weapon-freeze span").text(bonus[0].number)
		}else if(e.keyCode == 118){
			bonus[1].number += 1;
			$("#weapons #weapon-goBack span").text(bonus[1].number)
		}



	})


	/////
	////////     update and checks Functions
	/////


	function updateTargetPosition(){

		target.lastTouch += game.refresh;

		var targetResteTime = 1500;

		if(game.level >= 2){targetResteTime=1000}
			if(game.level >= 5){targetResteTime=600}

		if(target.lastTouch>targetResteTime){			

			if(target.freeze == 0){
				target.height += target.stepHeight;

				if(target.height>0){
					setCssTranslate(target.selector, 0, target.height)
				}else{
					target.height = 0;
				}

				target.lastTouch = 0;

			}else{
				target.freeze--;
			}
		}

		if($('#target .contact-zone').length>1){
			$('#target .contact-zone').remove();
			initTargetContact();

		}

		if(target.height>= parseInt( $safeZone[0].offsetTop - 60 )){
			gameLoose();
		}


	}

	function updateShootPosition(){

		for(i=0;shoots.length>i;i++){

			new_translateY = parseInt( shoots[i].translateY - shoots[i].speed );
			shoots[i].translateY = new_translateY;
			shoots[i].y = parseInt(shoots[i].selector[0].offsetTop + new_translateY);

			setCssTranslate(shoots[i].selector, 0, shoots[i].translateY ) ; 


			if(checkCollision(shoots[i])){
				
				shoots[i].passed = true;

			}

			bonusFallingHitCheck(shoots[i]);


			if(shoots[i].y<parseInt(-50)){
				shoots[i].selector.remove();
				shoots.splice(i,1);
			}

		}

	}




	function updateBonusPosition(){

		var $bonusFalling = $("#bonus-container .bonus");

		for(var key in bonusFalling){

			bonusFalling[key].translateY = parseInt(bonusFalling[key].translateY+3);
			setCssTranslate(bonusFalling[key].selector, 0, bonusFalling[key].translateY )

			if(bonusFalling[key].translateY > parseInt( docHeight-$safeZone.height() ) ){
				
				bonusFalling[key].selector.remove();
				bonusFalling.splice(bonusFalling[key],1)

			}
		}

	}



	/////
	////////     Collisition & actions with
	/////



	function checkCollision(shoot){



		if(shoot.y<target.height && shoot.passed == false){

			if(targetContact.x <= shoot.x && shoot.x <= parseInt(targetContact.x + targetContact.width) ){

				hitTargetContact(shoot);

			}


			return true;
		}

		return false;

	}


	function hitTargetContact(shoot){

		targetContact.life -= shoot.strength;


		if(targetContact.life<=0){

			game.score += targetContact.point; 
			target.height -= 25;


			targetContact.selector.remove();
			initTargetContact();
		}


		if(shoot.freeze == 1){
			shoot.freeze = 0;
			target.freeze = 30;
			$weaponsBtn.removeClass("selected");
		}

		if(shoot.goBack == 1){

			var goBackHeight = 3 * target.stepHeight;

			target.selector.css('height', goBackHeight+"px" )
			target.height = goBackHeight;

			shoot.goBack = 0;
		}

		refreshViewScore();

	}


	function bonusFallingHitCheck(shoot){

		var contact_zone  = new Array();


		for(var key in bonusFalling){


				if(shoot!=undefined && bonusFalling[key]!=undefined){

					contact_zone = new Array();
					var	thisBonus = bonusFalling[key];

					contact_zone['bonusFalling'] = thisBonus;
					contact_zone['x-start'] = thisBonus.x;
					contact_zone['x-end'] = parseInt( thisBonus.x + thisBonus.width );
					contact_zone['y-start'] = parseInt(thisBonus.y+ thisBonus.translateY - 50 );
					contact_zone['y-end'] = parseInt( thisBonus.y + thisBonus.translateY + thisBonus.width + 50);

					if( contact_zone['x-start']<=shoot.x && shoot.x <= contact_zone['x-end'] && contact_zone['y-start'] <= shoot.y && shoot.y <= contact_zone['y-end'] ){

							setTimeout(function(){

								if(thisBonus.passed == false){
									bonus[bonusTable['freeze']].number +=1;
									refreshView();
									thisBonus.passed = true;
								}


								thisBonus.selector.remove();
								bonusFalling.splice(bonusFalling[key],1)
							}, 200);

					}
				}

			}
	}


	/////
	////////     Display Functions
	/////


	function refreshViewScore(){
		$score.text(game.score);
	}
	function refreshViewLevel(){
		$level.text(game.level);
	}

	function refreshView(){
		
		$score.text(game.score);
		$level.text(game.level);
		$weaponFreeze.text(bonus[bonusTable['freeze']].number);
		$weaponGoBack.text(bonus[bonusTable['goBack']].number);

	}



	/////
	////////     Tools Functions
	/////

	function setCssTranslate(element, x, y){
		element.css({
			'-webkit-transform':'translate('+x+'px, '+y+'px)',
			'-ms-transform':'translate('+x+'px, '+y+'px)',
			'-moz-transform':'translate('+x+'px, '+y+'px)',
			'-o-transform':'translate('+x+'px, '+y+'px)',
			'-khtml-transform':'translate('+x+'px, '+y+'px)',
			'transform':'translate('+x+'px, '+y+'px)'
		})	
	}


	function msToTime(duration) {
        var milliseconds = parseInt((duration%1000)/100)
            , seconds = parseInt((duration/1000)%60)
            , minutes = parseInt((duration/(1000*60))%60)
            , hours = parseInt((duration/(1000*60*60))%24);

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        var to_return = seconds;

        if(minutes>0){to_return = minutes + ":" + seconds}
        if(hours>0){ to_return = hours + ":" + minutes + ":" + seconds}

        return to_return;
    }

})