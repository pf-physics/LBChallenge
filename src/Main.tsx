import React, { useState, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import { RGB, ColorHold, Blank, Tile, Source, GameInfo} from './Types'

// Initializes blank board with all sources and tiles
const initBoard = (width: number, length: number) => {
  let arr = new Array(length).fill(new Array<ColorHold>(width)).map((_,i)=> new Array<ColorHold>(width).fill(new Tile).map((_,j) =>
    {
      // Corners are empty
      if ((i === 0 && (j === 0 || j === width-1)) || (i === length-1 && (j === 0 || j === width-1))) {
        return new Blank()
        }
        // Sides have sources
        else if (i === 0 || j === 0 || i === length-1 || j === width-1 ) {
          return new Source(i,j)
        } else {
          // Tiles everywhere else
          const tile = new Tile()
          if (i === 1 && j === 1) {
            tile.isClosest = true;
          }
          return tile
        }
    }))

  return arr
}


function Main() {
  const [isLoad, setLoad] = useState(true)
  const [userId, setUserId] = useState<string>()
  const [moves, setMoves] = useState<number>(0)
  const [targetTile, setTargetTile] = useState<Tile>(new Tile())
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [board, setBoard] = useState<ColorHold[][]>([])
  const [selectedTile, selectTile ] = useState<Tile|undefined>()
  const [closest, setClosest] = useState<Tile>(new Tile())
  const [gameWon, setGameWon] = useState(false)

  // First three moves
  const [initSource, upInitSource] = useState<RGB[]>([])

  const delta = (c: Tile) =>
    100 * 1/255 * 1/Math.sqrt(3) * Math.sqrt((targetTile.rgb.red - c.rgb.red)**2 + (targetTile.rgb.green - c.rgb.green)**2 + (targetTile.rgb.blue - c.rgb.blue)**2)

  const fetchGame = async () => {
    // The api in the repo does not match the docs
    const url = userId ? "http://localhost:9876/init/user/" + userId : "http://localhost:9876/init"
    await fetch(url)
      .then(r => r.json())
      .then(
        (r) => {
          const v = r as GameInfo
          setUserId(v.userId)
          setHeight(v.height + 2)
          setWidth(v.width + 2)
          setMoves(v.maxMoves)
          setTargetTile(new Tile({red: v.target[0], green: v.target[1], blue: v.target[2]}))

          // Update board info with args from api call
          // Width and length + 2 to allow source rows/cols
          var board = initBoard(v.width + 2, v.height + 2)
          setBoard(board)
          // Choose first tile to be closest on init
          if (board[1][1] instanceof Tile) {
            setClosest(board[1][1])
          }
          // Reverse order of colors so can pop()
          upInitSource([{red: 0, green: 0, blue: 255}, {red: 0, green: 255, blue: 0}, {red: 255, green: 0, blue: 0}])
          setLoad(false)
        },
          (err) => {console.log(err)}
        )

  };

  useEffect(() => {
    fetchGame()
  }, []);

  const resetGame = () => {
    setLoad(true)
    setGameWon(false)
    fetchGame()
  }

  // Computes all four influences on tile in question
  const recalcColor = (i: number, j: number, tiles: ColorHold[][]): RGB => {
    // w and h have + 2, so formula is different
    const w = width - 1
    const h = height - 1
    const red =
      tiles[i][0].rgb.red * (w-j)/w
      + tiles[i][w].rgb.red * j/w
      + tiles[0][j].rgb.red * (h-i)/h
      + tiles[h][j].rgb.red * i/h
    const green =
      tiles[i][0].rgb.green * (w-j)/w
      + tiles[i][w].rgb.green * j/w
      + tiles[0][j].rgb.green * (h-i)/h
      + tiles[h][j].rgb.green * i/h
    const blue =
      tiles[i][0].rgb.blue * (w-j)/w
      + tiles[i][w].rgb.blue * j/w
      + tiles[0][j].rgb.blue * (h-i)/h
      + tiles[h][j].rgb.blue * i/h
    const f = 255/Math.max(red, green, blue, 255)

    return {red: f*red, green: f*green, blue: f*blue}

  }

  // Recalc everything when source is updated
  const processMove = (src: Source) => {
    const newArr = [...board]
    var newClosest = new Tile()
    newArr[src.row][src.col] = src

    // Have to update tiles in row/col based on where the source is
    if (src.row !== 0 && src.row !== height-1) {
      for (let j = 1; j < width-1; j++) {
        const c = recalcColor(src.row, j, newArr)
        newArr[src.row][j] = new Tile ({red: c.red, green: c.green, blue: c.blue})
      }
    } else {
      for (let i = 1; i < height-1; i++) {
        const c = recalcColor(i, src.col, newArr)
        newArr[i][src.col] = new Tile ({red: c.red, green: c.green, blue: c.blue})
      }
    }

    // Find new closest
    // Must search entire board (minus sources) in case current closest was overwritten
    for (let i = 1; i < height-1; i++) {
      for (let j = 1; j < width-1; j++) {
        const c = newArr[i][j]
        if (c instanceof Tile && delta(c) <= delta(newClosest)) {
          newClosest = c
        }
      }
    }

    closest.isClosest = false
    newClosest.isClosest = true
    setClosest(newClosest)
    setBoard(newArr)

    // To prevent popup if won but don't continue
    // Requires page refresh to restart game
    if (gameWon) return

    if (moves > 0 && delta(newClosest) < 10) {
      setGameWon(true)
      if(window.confirm("You won! Play again?")) {
        resetGame()
      }
    }
    else if (moves-1 === 0) {
      if (window.confirm("You lost. Play again?")) {
        resetGame()
      }
    }

    if (moves > 0) {
      setMoves(moves-1)
    }
  }

  // First 3 source clicks assigning RGB
  const sourceClick = (src: Source) => {
    let c = initSource.pop()
    if (c) {
      upInitSource(initSource)
      src.setColors(c)
      processMove(src)
    }
  }

  // Drag and drop update
  // Assuming you can drag and drop even if rgb sources have not yet been picked
  const sourceUpdate = (src: Source) => {
    if (selectedTile instanceof Tile) {
      src.setColors(selectedTile.rgb)
      selectTile(undefined)
      processMove(src)
    }
  }

  // Render individual board elements
  const renderBoardElem = ( el: ColorHold, id: string) => {
    const margin = "2px"
    const scale = "30px"

    const mouseDrag = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault()
    }

    if (el instanceof Tile) {
      const border = (el as Tile).isClosest ? "3px solid red" : "3px solid grey"

      return(
      <Tooltip id={id} followCursor={true} enterDelay={700} title={el.getLabel()}>
      <div
        id={id}
        className='tile'
        draggable={true}
        onDragStart={() => selectTile(el)}
        onDragEnd={() => selectTile(undefined)}
        onDragOver={mouseDrag}
        onDragCapture={mouseDrag}
        style={{margin: margin, backgroundColor: el.getCss(), width: scale, height: scale, border: border, borderRadius: "5px"}}>
        </div>
      </Tooltip>)

    } else if (el instanceof Source) {

      return <div
      className={ initSource.length > 0 ? 'clickable source' : 'source'}
      onDragLeave={mouseDrag}
      onDragOver={mouseDrag}
      onDropCapture={() => sourceUpdate(el)}
      onClick = {() => sourceClick(el)}
      style={{margin: margin, backgroundColor: el.getCss(), width: scale, height: scale, border: "3px solid grey", borderRadius: scale}}>
    </div>
    } else {
      return <div
      style={{margin: margin, width: scale, height: scale, border: "2px solid transparent", borderRadius: "5px"}}>
    </div>
    }
  }

  const renderRow = (row : ColorHold[], i: number ) => {
    return <div draggable={false} key={"row" + i} style={{display:"flex"}}>
      {row.map((c,j) => <div key={"col" + j + i}>{renderBoardElem(c, "tile" + j + i)}</div>)}
    </div>
  }

  const RenderSampleEl = ({el, id}:{el: Tile, id: string}) => {
    const margin = "2px"
    const scale = "30px"
    const border = "3px solid grey"

    return(
      <span style={{paddingLeft:"10px", paddingRight:"10px"}}>
      <Tooltip id={id} followCursor={true} enterDelay={700} title={el.getLabel()}>
      <div
        id={id}
        className={'display'}
        style={{margin: margin, backgroundColor: el.getCss(), width: scale, height: scale, border: border, borderRadius: "5px"}}>
        </div>
      </Tooltip>
      </span>
      )
  }

    return (
    <div id={"Main"}>
      { isLoad ? <CircularProgress/> :
      <span>
        <div className="mainText"><b>RGB Alchemy</b></div>
        <div className="mainText">UserId: {userId}</div>
        <div className="mainText">Moves Left: {moves}</div>
        <div className="mainText">Target Color: <RenderSampleEl el={targetTile} id="target"/></div>
        <div className="mainText">Closest Color:
          <RenderSampleEl el={new Tile(closest.rgb)} id="closest"/>
          <span>{"Δ = " + Math.round(delta(closest)*100)/100 + "%"}
          </span>
        </div>
        <br/>
        {board.map(renderRow)}
      </span>}
    </div>
  );
}

export default Main;
