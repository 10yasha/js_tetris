let canvas;
let ctx;

//// GAMEBOARD CONSTANTS
const GAMEBOARDHEIGHT = 20; // number squares vertically
const GAMEBOARDWIDTH = 10; // number squares horizontally
const TILESIZE = 23; // number of pixels per square
const STARTX = 3; // start X position for tetromino
const STARTY = 0; // start Y position for tetromino
const DOWNMULTIPLIER = 3; // points multiplier when player presses down to move tetromino faster
const LEVELINTERVAL = 1; // interval of levels based on lines completed, up to max of level 10

//// GAME VALUES TRACKED
let score = 0;
let level = 1;
let gameState = true; // true: playing, false: game over
let linesCompleted = 0;

//// GAME LOGIC

// class for all gameboard coordinates
class Coordinates{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

// LUT to convert indices (eg. x=1, y=3) into corresponding pixel values (eg. x=28, y=180)
let coordinateLUT = [...Array(GAMEBOARDHEIGHT)].map(e => Array(GAMEBOARDWIDTH).fill(0));

// tracks stopped tetrominos and their colors
let gameBoardArray = [...Array(GAMEBOARDHEIGHT)].map(e => Array(GAMEBOARDWIDTH).fill(0));

// set of possible tetrominos
let possibleTetrominos = [];
//colors matched to possibleTetrominos
let tetrominoColors = ['purple','cyan','blue','yellow','orange','green','red'];

// current tetromino info
// let currentTetromino = [[1,0], [0,1], [1,1], [2,1]];
// let currentTetrominoColor = 'purple';
let currentTetromino;
let currentTetrominoColor;
let currentPosition = new Coordinates(STARTX, STARTY);

// reserve tetromino info (next piece previewed on side)
let previewTetromino;
let previewTetrominoColor;

// to be able to draw the preview tetromino
let previewCoordinateLUT = [...Array(4)].map(e => Array(4).fill(0));



//// MAIN CODE HERE

document.addEventListener('DOMContentLoaded', main);

// interval for tetromino falling down
let gameTicker = window.setInterval(() => {
    if(gameState){
        MoveTetrominoDown();
    }
}, GetLevelSpeed());


function main(){
    InitGameBoard();

    document.addEventListener('keydown', HandleKeyPress);

    // create possible tetrominos
    InitPossibleTetrominos();

    // get the first tetrominos
    InitFirstTetrominos();

    // LUT for coordinates of each possible square
    InitCoordinateLUT();

    // LUT for preview display
    InitPreviewCoordinateLUT();

    // draw the first tetromino
    DrawTetromino();

    // fill in preview display with next waiting tetromino
    DrawPreview();
}

// set up gameboard
function InitGameBoard(){
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    canvas.width = 700;
    canvas.height = 700;

    // background
    ctx.fillStyle = 'rgb(30,120,220)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width-0-8, canvas.height-0-8); // size-previousCombinedLineWidth*2-lineWidth

    let grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "red");
    grd.addColorStop(0.5, "blue");
    grd.addColorStop(1, "magenta");
    ctx.strokeStyle = grd;
    ctx.lineWidth = 12;
    ctx.strokeRect(8+12/2, 8+12/2, canvas.width-8*2-12, canvas.height-8*2-12);

    ctx.strokeStyle = 'black'; // just some extra line
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, canvas.width-0-8, canvas.height-0-8);
    
    // gameboard
    ctx.fillStyle = 'black';
    ctx.fillRect(98, 98, 234, 464);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(98, 98, 234, 464);

    // preview display
    ctx.fillStyle = 'black';
    ctx.fillRect(350, 140, 48, 48);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(350, 140, 48, 48);

    // title
    ctx.fillStyle = 'black';
    ctx.font = 'bold 50px Copperplate';
    ctx.fillText("TETRIS", 410, 90);
    ctx.strokeStyle = grd;
    ctx.strokeText("TETRIS", 410, 90);

    // score
    ctx.font = '20px Arial';
    ctx.fillText("SCORE", 420, 140);
    UpdateScoreDisplay();
    
    // level
    ctx.fillText("LEVEL", 420, 220);
    UpdateLevelDisplay();

    // gamestate
    ctx.fillText("GAMESTATE", 420, 300);
    UpdateGameState();
    
    // controls
    ctx.fillText("CONTROLS", 420, 380);
    ctx.fillStyle = 'white';
    ctx.fillRect(420, 400, 161, 130);
    ctx.fillStyle = 'black';
    ctx.strokeRect(420, 400, 161, 130);
    ctx.font = '16px Arial';
    ctx.fillText("A : Move Left", 430, 420);
    ctx.fillText("D : Move Right", 430, 440);
    ctx.fillText("S : Move Down", 430, 460);
    ctx.fillText("E/K : Rotate CW", 430, 480);
    ctx.fillText("Q/J : Rotate CCW", 430, 500);
    ctx.fillText("P : Reset Game", 430, 520);
}

function UpdateScoreDisplay(){
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillRect(420, 156, 160, 26);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(420, 156, 160, 26);
    ctx.fillStyle = 'black';
    ctx.fillText(score.toString(), 430, 176);
}

function UpdateLevelDisplay(){
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillRect(420, 236, 160, 26);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(420, 236, 160, 26);
    ctx.fillStyle = 'black';
    ctx.fillText(level.toString(), 430, 256);
}

function UpdateGameState(){
    ctx.fillStyle = 'white';
    ctx.fillRect(420, 316, 160, 28);
    ctx.fillStyle = 'black';
    ctx.strokeRect(420, 316, 160, 28);
    ctx.fillText(gameState ? 'Playing' : 'Game Over', 430, 336);
}

function InitCoordinateLUT(){
    // top left corner is start pixel 
    let initialX = 100;
    let initialY = 100;

    for(let i = 0; i < GAMEBOARDWIDTH; i++ ){
        for(let j = 0; j < GAMEBOARDHEIGHT; j++){
            xCoor = initialX + i*TILESIZE
            yCoor = initialY + j*TILESIZE
            coordinateLUT[i][j] = new Coordinates(xCoor, yCoor)
            ctx.strokeStyle = 'rgb(192,192,192)';
            ctx.lineWidth = 1;
            ctx.strokeRect(xCoor, yCoor, TILESIZE, TILESIZE);
        }
    }
}

function InitPreviewCoordinateLUT(){
    // top left corner is start pixel 
    let initialX = 358;
    let initialY = 148;

    for(let i = 0; i < 4; i++ ){
        for(let j = 0; j < 4; j++){
            xCoor = initialX + i*8
            yCoor = initialY + j*8
            previewCoordinateLUT[i][j] = new Coordinates(xCoor, yCoor)
            ctx.strokeStyle = 'rgb(130,130,130)';
            ctx.lineWidth = 1;
            ctx.strokeRect(xCoor, yCoor, 8, 8);
        }
    }
}

function HandleKeyPress(e){
    if(e.keyCode === 65){ // A-key, left
        if(CanMoveInDirection('left')){
            DeleteTetromino();
            currentPosition.x--;
            DrawTetromino();
        }
    } else if(e.keyCode === 68){ // D-key, right
        if(CanMoveInDirection('right')){
            DeleteTetromino();
            currentPosition.x++;
            DrawTetromino();
        }
    } else if(e.keyCode === 83){ // S-key, down
        MoveTetrominoDown()

        // increase score for moving tetromino down faster, only if game isn't over
        if (!CheckForGameOver()){
            score += level * DOWNMULTIPLIER;
            UpdateScoreDisplay();
        }
    } else if(e.keyCode === 69 || e.keyCode === 75){ // E-key/K-key, clockwise rotation
        RotateTetromino('clockwise');
    } else if(e.keyCode === 81 || e.keyCode === 74){ // Q-key/J-key, counterclockwise rotation
        RotateTetromino('counterclockwise');
    } else if(e.keyCode === 80){ // P-key, reset game
        ResetGame();
    }
}

// resets all game states
function ResetGame(){
    gameBoardArray = [...Array(GAMEBOARDHEIGHT)].map(e => Array(GAMEBOARDWIDTH).fill(0));
    score = 0;
    level = 1;
    gameState = true; // true: playing, false: game over
    linesCompleted = 0;

    // gameboard
    ctx.lineWidth = 3;
    ctx.fillStyle = 'black';
    ctx.fillRect(98, 98, 234, 464);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(98, 98, 234, 464);

    // preview display
    ctx.fillStyle = 'black';
    ctx.fillRect(350, 140, 48, 48);
    ctx.strokeStyle = 'rgb(192,192,192)';
    ctx.strokeRect(350, 140, 48, 48);

    UpdateScoreDisplay();
    
    UpdateLevelDisplay();

    UpdateGameState();

    // get the first tetrominos
    InitFirstTetrominos();

    // LUT for coordinates of each possible square
    InitCoordinateLUT();

    // LUT for preview display
    InitPreviewCoordinateLUT();

    // draw the first tetromino
    DrawTetromino();

    // fill in preview display with next waiting tetromino
    DrawPreview();

    // update tetromino falling speed
    clearInterval(gameTicker);
    gameTicker = window.setInterval(() => {
        if(gameState){
            MoveTetrominoDown();
        }
    }, GetLevelSpeed());
}

function DrawPreview(){
    // first clear the  preview display
    for(let i = 0; i < 4; i++){
        for(let j = 0; j < 4; j++){
            let coorX = previewCoordinateLUT[i][j].x;
            let coorY = previewCoordinateLUT[i][j].y;

            ctx.fillStyle = 'black';
            ctx.fillRect(coorX+1, coorY+1, 7, 7);
        }
    }

    // draw new preview tetromino in display
    for(let i = 0; i < previewTetromino.length; i++){ // loop through all tiles of currentTetromino
        xIndex = previewTetromino[i][0];
        yIndex = previewTetromino[i][1];

        let coorX = previewCoordinateLUT[xIndex][yIndex].x;
        let coorY = previewCoordinateLUT[xIndex][yIndex].y;

        ctx.fillStyle = previewTetrominoColor;
        ctx.fillRect(coorX+1, coorY+1, 7, 7);
    }
}

function DrawTetromino(){
    for(let i = 0; i < currentTetromino.length; i++){ // loop through all tiles of currentTetromino
        xIndex = currentTetromino[i][0] + currentPosition.x;
        yIndex = currentTetromino[i][1] + currentPosition.y;

        let coorX = coordinateLUT[xIndex][yIndex].x;
        let coorY = coordinateLUT[xIndex][yIndex].y;

        ctx.fillStyle = currentTetrominoColor;
        ctx.fillRect(coorX+1, coorY+1, 21, 21);
    }
}

function DeleteTetromino(){
    for(let i = 0; i < currentTetromino.length; i++){
        xIndex = currentTetromino[i][0] + currentPosition.x;
        yIndex = currentTetromino[i][1] + currentPosition.y;

        let coorX = coordinateLUT[xIndex][yIndex].x;
        let coorY = coordinateLUT[xIndex][yIndex].y;

        ctx.fillStyle = 'black';
        ctx.fillRect(coorX+1, coorY+1, 21, 21);
    }
}

function MoveTetrominoDown(){
    if(CanMoveInDirection('down')){
        DeleteTetromino();
        currentPosition.y++;
        DrawTetromino();
    } else{ // tetromino comes to a stop and get new tetromino
        PlaceTetromino()

        if(CheckForGameOver()){ // is game over if current piece touches top of screen (y=0)
            gameState = false;
            UpdateGameState();
        } else{
            CheckForCompletedRows()
            GetNewTetromino()
            DrawTetromino()
            DrawPreview();
        }
    }
}

// places current tetromino on the gameboard
function PlaceTetromino(){
    for(let i = 0; i < currentTetromino.length; i++){
        xCoor = currentTetromino[i][0]+currentPosition.x;
        yCoor = currentTetromino[i][1]+currentPosition.y;
        gameBoardArray[xCoor][yCoor] = currentTetrominoColor;
    }
}

function CheckForGameOver(){
    for(let i = 0; i < currentTetromino.length; i++){
        if(currentTetromino[i][1]+currentPosition.y == 0){
            return true;
        }

        // currently draws over the top block when game over happens, could fix, but probably not worth it
        // xCoor = currentTetromino[i][0]+currentPosition.x;
        // yCoor = currentTetromino[i][1]+currentPosition.y;

        // if(typeof gameBoardArray[xCoor][yCoor] === 'string'){
        //     return true;
        // }
    }
    return false;
}

// run through all rows to find if any are completed, also calls moveRowsDown() after and updates the score display
function CheckForCompletedRows(){
    let startOfDeletion = -1;
    let numRowsToDelete = 0;
    let rowCompleted = false;

    for(let j = 0; j < GAMEBOARDHEIGHT; j++){
        for(let i = 0; i < GAMEBOARDWIDTH; i++){
            rowCompleted = true;
            if(typeof gameBoardArray[i][j] !== 'string'){
                rowCompleted = false;
                break;
            }
        }

        if(rowCompleted){
            if(startOfDeletion === -1) startOfDeletion = j; 
            numRowsToDelete++;
        }
    }

    if(startOfDeletion !== -1){
        // delete rows
        for(let j = startOfDeletion; j < startOfDeletion + numRowsToDelete; j++){
            for(let i = 0; i < GAMEBOARDWIDTH; i++){
                // clear gameboard
                gameBoardArray[i][j] = 0;

                // clear visual display
                let coorX = coordinateLUT[i][j].x;
                let coorY = coordinateLUT[i][j].y;
                ctx.fillStyle = 'black';
                ctx.fillRect(coorX+1, coorY+1, 21, 21);
            }
        }
        MoveRowsDown(startOfDeletion, numRowsToDelete);

        // update the score here
        UpdateScoreForCompletion(numRowsToDelete);
        UpdateScoreDisplay()

        // update lines completed and level if threshold met
        linesCompleted += numRowsToDelete;
        UpdateLevel();
        UpdateLevelDisplay();

        // update tetromino falling speed
        clearInterval(gameTicker);
        gameTicker = window.setInterval(() => {
            if(gameState){
                MoveTetrominoDown();
            }
        }, GetLevelSpeed());
    }
}

// moves rows down based on completed rows
function MoveRowsDown(startOfDeletion, numRowsToDelete){
    for (let j = startOfDeletion-1; j >= 0; j--){
        for(let i = 0; i < GAMEBOARDWIDTH; i++){
            // move square down gameboard (in memory)
            gameBoardArray[i][j + numRowsToDelete] = gameBoardArray[i][j];

            // move square down gameboard (in display)
            // redraw square in new location
            let coorX = coordinateLUT[i][j + numRowsToDelete].x;
            let coorY = coordinateLUT[i][j + numRowsToDelete].y;
            ctx.fillStyle = gameBoardArray[i][j + numRowsToDelete];
            ctx.fillRect(coorX+1, coorY+1, 21, 21);

            // delete square in old location
            coorX = coordinateLUT[i][j].x;
            coorY = coordinateLUT[i][j].y;
            ctx.fillStyle = 'black';
            ctx.fillRect(coorX+1, coorY+1, 21, 21);
        }
    }
}

// updates score for completing number of rows (up to 4 possible rows completed at once)
function UpdateScoreForCompletion(numRows){
    switch(numRows){
        case 1:
            score += 100;
            break;
        case 2:
            score += 300;
            break;
        case 3:
            score += 600;
            break;
        case 4:
            score += 1200;
            break;
        default:
            // pass
    }
}

function CanMoveInDirection(direction){
    if(direction === 'left'){
        for(let i = 0; i < currentTetromino.length; i++){
            xIndex = currentTetromino[i][0] + currentPosition.x;
            
            if(xIndex === 0){ // is on the furthest left squares
                return false;
            } else { // check if anything to the left on gameboard
                yIndex = currentTetromino[i][1] + currentPosition.y;
                if(typeof gameBoardArray[xIndex-1][yIndex] === 'string'){ // string means square is occupied
                    // console.log('something left')
                    return false;
                }
            }
        }
        return true;
    } else if(direction === 'right'){
        for(let i = 0; i < currentTetromino.length; i++){
            xIndex = currentTetromino[i][0] + currentPosition.x;
            
            if(xIndex === GAMEBOARDWIDTH-1){ // is on the furthest right squares
                return false;
            } else { // check if anything to the right on gameboard
                yIndex = currentTetromino[i][1] + currentPosition.y;
                if(typeof gameBoardArray[xIndex+1][yIndex] === 'string'){ // string means square is occupied
                    // console.log('something right')
                    return false;
                }
            }
        }
        return true;
    } else if(direction === 'down'){
        for(let i = 0; i < currentTetromino.length; i++){
            yIndex = currentTetromino[i][1] + currentPosition.y;
            
            if(yIndex === GAMEBOARDHEIGHT-1){ // is on the furthest down squares
                return false;
            } else { // check if anything below on gameboard
                xIndex = currentTetromino[i][0] + currentPosition.x;
                if(typeof gameBoardArray[xIndex][yIndex+1] === 'string'){ // string means square is occupied
                    // console.log('something down');
                    return false;
                }
            }
        }
        return true;
    }
}

function DrawTetromino(){
    for(let i = 0; i < currentTetromino.length; i++){ // loop through all tiles of currentTetromino
        xIndex = currentTetromino[i][0] + currentPosition.x;
        yIndex = currentTetromino[i][1] + currentPosition.y;
        // gameBoardArray[xIndex][yIndex] = currentTetrominoColor;

        let coorX = coordinateLUT[xIndex][yIndex].x;
        let coorY = coordinateLUT[xIndex][yIndex].y;

        ctx.fillStyle = currentTetrominoColor;
        ctx.fillRect(coorX+1, coorY+1, 21, 21);
    }
}

function RotateTetromino(direction){
    if(currentTetrominoColor === 'yellow') return; // square so don't rotate

    let newXIndex;
    let newYIndex;
    let rotatedTetromino = new Array();
    let canRotate = true; // flag to indicate if rotation is valid

    for(let i = 0; i < currentTetromino.length; i++){
        xIndex = currentTetromino[i][0];
        yIndex = currentTetromino[i][1];
        
        if(direction === 'clockwise'){
            // newXIndex = GetFurthestX() - yIndex;
            newXIndex = GetFurthestXVersion2() - yIndex; // better rotation
            newYIndex = xIndex;
        } else if(direction === 'counterclockwise'){
            newXIndex = yIndex;
            newYIndex = GetFurthestY() - xIndex;
        }

        // check gameboard if rotation is valid of this square
        checkXIndex = newXIndex + currentPosition.x;
        checkYIndex = newYIndex + currentPosition.y;

        if(checkXIndex < 0 || checkYIndex < 0 || checkYIndex > 19 || typeof gameBoardArray[checkXIndex][checkYIndex] === 'string'){
            // off the gameboard or square already present here, invalid
            canRotate = false;
            break;
        }

        rotatedTetromino.push([newXIndex, newYIndex]);
    }

    if(canRotate){
        DeleteTetromino();
        currentTetromino = rotatedTetromino;
        DrawTetromino();
    }
}

// gets furthest right xCoord
function GetFurthestX(){
    let furthestX = -1;
    let xIndex;
    for(let i = 0; i < currentTetromino.length; i++){
        xIndex = currentTetromino[i][0];
        if (xIndex > furthestX) furthestX = xIndex;
    }
    return furthestX;
}

// gets furthest right xCoord based on which tetromino it is (based on color)
function GetFurthestXVersion2(){
    switch (true) {
        case (currentTetrominoColor === 'cyan'): // line piece
            return 3;
        case (currentTetrominoColor === 'yellow'): // square piece
            return 2; // not sure which value is best
        default:
            return 2;
    }
}

// gets furthest down yCoord
function GetFurthestY(){
    let furthestY = -1;
    let yIndex;
    for(let i = 0; i < currentTetromino.length; i++){
        yIndex = currentTetromino[i][1];
        if (yIndex > furthestY) furthestY = yIndex;
    }
    return furthestY;
}


// Possible tetrominos
// tetrominoColors = ['purple','cyan','blue','yellow','orange','green','red']
// 3 width: purple, blue, orange, green, red
// 4 width: cyan
// 2 width: yellow
function InitPossibleTetrominos(){
    // Push T, purple
    possibleTetrominos.push([[1,0], [0,1], [1,1], [2,1]]);
    // Push I, cyan
    possibleTetrominos.push([[0,0], [1,0], [2,0], [3,0]]);
    // Push J, blue
    possibleTetrominos.push([[0,0], [0,1], [1,1], [2,1]]);
    // Push Square, yellow
    // possibleTetrominos.push([[0,0], [1,0], [0,1], [1,1]]);
    possibleTetrominos.push([[1,0], [2,0], [1,1], [2,1]]);
    // Push L, orange
    possibleTetrominos.push([[2,0], [0,1], [1,1], [2,1]]);
    // Push S, green
    possibleTetrominos.push([[1,0], [2,0], [0,1], [1,1]]);
    // Push Z, red
    possibleTetrominos.push([[0,0], [1,0], [1,1], [2,1]]);
}

// initializes opening tetrominos
function InitFirstTetrominos(){
    // first tetromino
    let tetrominoIndex = Math.floor(Math.random() * possibleTetrominos.length);
    currentTetromino = possibleTetrominos[tetrominoIndex];
    currentTetrominoColor = tetrominoColors[tetrominoIndex];
    currentPosition = new Coordinates(STARTX, STARTY)

    // second tetromino
    tetrominoIndex = Math.floor(Math.random() * possibleTetrominos.length);
    previewTetromino = possibleTetrominos[tetrominoIndex];
    previewTetrominoColor = tetrominoColors[tetrominoIndex];
}

// pulls the next tetromino and moves previewTetromino into currentTetromino
function GetNewTetromino(){
    currentTetromino = previewTetromino;
    currentTetrominoColor = previewTetrominoColor;
    currentPosition = new Coordinates(STARTX, STARTY)

    // pulls new tetromino
    let tetrominoIndex = Math.floor(Math.random() * possibleTetrominos.length);
    previewTetromino = possibleTetrominos[tetrominoIndex];
    previewTetrominoColor = tetrominoColors[tetrominoIndex];
}

// update level based on lines completed
function UpdateLevel(){
    switch (true) {
        case (linesCompleted <= LEVELINTERVAL*1):
            level = 1;
            break;
        case (linesCompleted <= LEVELINTERVAL*2):
            level = 2;
            break;
        case (linesCompleted <= LEVELINTERVAL*3):
            level = 3;
            break;
        case (linesCompleted <= LEVELINTERVAL*4):
            level = 4;
            break;
        case (linesCompleted <= LEVELINTERVAL*5):
            level = 5;
            break;
        case (linesCompleted <= LEVELINTERVAL*6):
            level = 6;
            break;
        case (linesCompleted <= LEVELINTERVAL*7):
            level = 7;
            break;
        case (linesCompleted <= LEVELINTERVAL*8):
            level = 8;
            break;
        case (linesCompleted <= LEVELINTERVAL*9):
            level = 9;
            break;
        case (linesCompleted <= LEVELINTERVAL*10):
            level = 10;
            break;
        default:
            // pass
    }
}

// get speed in milliseconds for automatic downward movement interval
function GetLevelSpeed(){
    return 1100 - level * 100;
}