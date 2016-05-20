/*eslint "no-unused-vars": "off"*/
import React from 'react';
import { Link } from 'react-router';
import Game from 'connect-four';
import gun from './gun.jsx';
import ChoosePlayer from './ChoosePlayer.jsx';
import GameStatus from './GameStatus.jsx';
require('./styles/Table.scss');

const armada = {};

function generateTable(react) {
	let cols = [];

	// Populate a table like structure
	for (let col = 0; col < react.game.cols; col += 1) {
		let cells = [];
		for (let row = react.game.rows - 1; row >= 0; row -= 1) {
			let id = react.game.format(col, row);
			let color = react.state[id] || '';
			let cell = <div
				key={id}
				className='cell'
				data-coord={id}
				onClick={react.click.bind(react)}>
				<div
					className={`${color} hole`}
					id={id}
					data-coord={id}></div>
			</div>;
			cells.push(cell);
		}
		let column = <div className='col' key={col}>{cells}</div>;
		cols.push(column);
	}

	return <div className='table'>
		{cols}
	</div>;
}

export default class Table extends React.Component {
	constructor() {
		super();
		const game = new Game();
		const table = this;
		this.game = game;
		this.state = {};
		game.on('play', (player, coord) => {
			if (table.state.unmounted) {
				return;
			}
			const key = game.format(coord.col, coord.row);
			table.setState(() => {
				return {
					[key]: player
				};
			});
		});
	}

	render() {
		const player = this.state.player;
		if (!player) {
			let gameID = this.props.params.gameID;
			return <ChoosePlayer gameID={gameID} parent={this} />;
		}
		const table = generateTable(this);

		return <div className='connect-four'>
			<header>
				<GameStatus player={this.state.player} game={this.game} />
			</header>
			<div className='container'>
				{table}
			</div>
		</div>;
	}

	click(e) {
		const coord = e.target.getAttribute('data-coord');
		if (coord === null) {
			return;
		}
		let col = coord.slice(0, 1);
		col = parseInt(col, 10);
		if (!this.game.validMove(col)) {
			return;
		}
		const key = this.props.params.gameID;
		const turns = armada[key];
		this.play(turns, col);
	}

	play(turns, col) {
		const player = this.state.player;
		if (!player || player === 'spectator') {
			return;
		}
		let quit = false;
		turns.not(function () {
			if (player !== 'player1') {
				// player1 starts first
				quit = true;
				return;
			}
			turns.put({ col, player });
		}).val(function (turn) {
			if (turn.player === player || quit) {
				// wait your turn
				return;
			}
			const next = this.path('next');
			next.not(() => {
				next.put({ col, player });
			});
		});
	}

	componentDidMount() {
		const key = this.props.params.gameID;
		const game = this.game;
		let turns = armada[key];
		if (!turns) {
			const games = gun.game(key).init();
			turns = armada[key] = games.path('turns');
			turns.recurse(function () {
				armada[key] = this.init();
			});
		}
		turns.recurse(turn => {
			game.play(turn.player, turn.col);
		});
	}

	componentWillUnmount() {
		const player = this.state.player;
		if (player) {
			const gameID = this.props.params.gameID;
			const game = gun.game(gameID);
			game.path('players').path(player).put(null);
		}

		/*
			This must be set synchronously,
			otherwise there are race conditions
			and React will throw errors.
			I'm not proud of it.
		*/
		this.state.unmounted = true;
	}
}
