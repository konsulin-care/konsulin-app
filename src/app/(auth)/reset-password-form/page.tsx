'use client';

import Input from '@/components/login/input';
import { decodeToken } from '@/utils/token';
import { specialCharacter, upperCaseOneCharacter } from '@/utils/validation';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [userPassword, setUserPassword] = useState({
    new_password: '',
    retype_new_password: '',
    token: ''
  });

  const [showPassword, setShowPassword] = useState({
    new_password: false,
    retype_new_password: false
  });

  const [errors, setErrors] = useState({
    new_password: '',
    retype_new_password: ''
  });

  const requestResetPassword = useMutation({
    mutationFn: async (new_password: typeof userPassword) => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(new_password)
          }
        );

        if (!response.ok) {
          throw new Error('Failed to reset password');
        }

        return response.json();
      } catch (err) {
        throw err;
      }
    },
    onSuccess: () => {
      toast.success('Password reset successful', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined
      });
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  });

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
      const { isExpired } = decodeToken(urlToken);
      if (isExpired) {
        console.log('Token is expired');
        return;
      } else {
        setUserPassword(prevState => ({
          ...prevState,
          token: urlToken
        }));
      }
    } else {
      console.log('No token found in URL');
    }
  }, []);

  function handleChangeInput(type: string, value: string) {
    setUserPassword(prevUserPassword => ({
      ...prevUserPassword,
      [type]: value
    }));
    setErrors({
      ...errors,
      [type]: ''
    });
  }

  function handleShowPassword(type: string) {
    setShowPassword(prevShowPassword => ({
      ...prevShowPassword,
      [type]: !showPassword[type]
    }));
  }

  function handleResetPassword() {
    const validationErrors = validateInputs();

    const hasErrors = Object.values(validationErrors).some(
      error => error !== ''
    );
    if (hasErrors) {
      setErrors(validationErrors);
      return;
    }
    requestResetPassword.mutate(userPassword);
  }

  function validateInputs() {
    const foundErrors = {
      new_password: '',
      retype_new_password: ''
    };

    const { new_password, retype_new_password } = userPassword;
    if (!new_password) {
      foundErrors.new_password = 'Password is required';
    } else if (new_password.length < 6) {
      foundErrors.new_password = 'Password must be at least 6 characters';
    } else if (!upperCaseOneCharacter(new_password)) {
      foundErrors.new_password =
        'Password must contain at least one uppercase letter';
    } else if (!specialCharacter(new_password)) {
      foundErrors.new_password =
        'Password must contain at least one number or special character';
    }

    if (!retype_new_password) {
      foundErrors.retype_new_password = 'Please confirm your password';
    } else if (retype_new_password !== new_password) {
      foundErrors.retype_new_password = 'Passwords do not match';
    }
    return foundErrors;
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-between px-4 py-8'>
      <div className='flex h-3/4 w-full flex-grow flex-col justify-start'>
        <div className='px-5 py-4'>
          <Image
            width={8}
            height={16}
            src={'/icons/chevron-left.svg'}
            alt='chevron-left-logo'
            onClick={() => router.back()}
          />
        </div>
        <div className='mt-28 flex w-full flex-col items-center justify-center'>
          <Image
            width={200}
            height={200}
            src={'/images/lock-forgot.svg'}
            alt='forgot-password-lock'
          />
          <p className='text-secondary pt-4 pb-2 text-xl font-bold capitalize'>
            Reset Ulang Password
          </p>
          <p className='text-center text-xs text-[#2C2F35] opacity-60'>
            Unfortunately we can’t recover your old password,
            <br />
            but you can reset your
          </p>
          <Input
            prefixIcon={'/icons/lock.png'}
            suffixIcon={'/icons/eye.png'}
            placeholder='Masukan Password Baru'
            name='new_password'
            id='new_password'
            type={showPassword.new_password ? 'text' : 'password'}
            onChange={(event: any) =>
              handleChangeInput('new_password', event.target.value)
            }
            outline={false}
            className='mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('new_password')}
          />
          {errors.new_password && (
            <p className='w-full px-4 pt-1 text-left text-xs text-red-500'>
              {errors.new_password}
            </p>
          )}

          <Input
            prefixIcon={'/icons/lock.png'}
            suffixIcon={'/icons/eye.png'}
            placeholder='Konfirmasi Password Baru'
            name='retype_new_password'
            id='retype_new_password'
            type={showPassword.retype_new_password ? 'text' : 'password'}
            onChange={(event: any) =>
              handleChangeInput('retype_new_password', event.target.value)
            }
            outline={false}
            className='mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('retype_new_password')}
          />
          {errors.retype_new_password && (
            <p className='w-full px-4 pt-1 text-left text-xs text-red-500'>
              {errors.retype_new_password}
            </p>
          )}
        </div>
      </div>
      <div className='flex w-full flex-col items-center justify-end'>
        <button
          className='text-md border-primary bg-secondary my-4 w-full rounded-full border-1 p-4 font-semibold text-white'
          type='button'
          onClick={handleResetPassword}
        >
          Reset Ulang
        </button>
      </div>
    </div>
  );
}
