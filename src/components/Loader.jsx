import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader" />
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    width: 2rem;
    height: 2rem;
    clear: both;
    margin: 1rem auto;
    border-radius: 50%;
    border-left: 0 #000 solid;
    border-right: 0 #000 solid;
    animation: spSphere 1s infinite linear;
  }

  @keyframes spSphere {
    0% {
      border-left: 0 #000 solid;
      border-right: 0 #000 solid;
    }

    33% {
      border-left: 2rem #000 solid;
      border-right: 0 #000 solid;
    }

    34% {
      border-left: 0 #000 solid;
      border-right: 2rem #000 solid;
    }

    66% {
      border-left: 0 #000 solid;
      border-right: 0 #000 solid;
    }
  }`;

export default Loader;
