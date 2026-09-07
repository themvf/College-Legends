import {render,screen,fireEvent} from '@testing-library/react';
import {beforeEach,it,expect} from 'vitest';
import {CoreGame} from './CoreGame.js';
beforeEach(()=>localStorage.clear());
it('starts with recruitment and connects the first recruit to development and a game',()=>{
render(<CoreGame/>);
expect(screen.getByRole('heading',{name:'Who will you build around?'})).toBeInTheDocument();
expect(screen.getByRole('button',{name:'Advance to Week 1'})).toBeDisabled();
fireEvent.click(screen.getByRole('button',{name:'Recruit Miles'}));
expect(screen.getByRole('button',{name:'Advance to Week 1'})).toBeEnabled();
fireEvent.click(screen.getByRole('button',{name:'Development'}));
fireEvent.click(screen.getByRole('button',{name:'Start development block'}));
expect(screen.getByText('Technique · 2/2 weeks remaining')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button',{name:'Advance to Week 1'}));
fireEvent.click(screen.getByRole('button',{name:'Awards'}));
expect(screen.getByText('Offensive player of the week')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button',{name:'Pro Draft'}));
expect(screen.getByText('Round 1 · Pick 1')).toBeInTheDocument();
});
