import { beforeEach, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BusinessGame } from './BusinessGame.js';
import { SAVE_KEY, parseSave } from './engine.js';
beforeEach(()=>{
  localStorage.clear();
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
it('starts with one signing decision and no management navigation',()=>{
  render(<BusinessGame/>);
  expect(screen.queryByRole('navigation')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Portrait of Miles Ellis/}));
  expect(screen.getByText('52-week compensation')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Confirm commitment'}));
  expect(screen.getByRole('button',{name:/Advance to Saturday/})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Business'})).toBeNull();
  expect(parseSave(localStorage.getItem(SAVE_KEY)!).business.cash).toBe(540000);
});
it('preserves a damaged original and leaves legacy storage untouched',()=>{
  localStorage.setItem(SAVE_KEY,'damaged original');localStorage.setItem('legacy-career','existing career');
  render(<BusinessGame/>);
  fireEvent.click(screen.getByRole('button',{name:/Portrait of Miles Ellis/}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm commitment'}));
  expect(localStorage.getItem(SAVE_KEY+'-recovery')).toBe('damaged original');
  expect(localStorage.getItem('legacy-career')).toBe('existing career');
});
