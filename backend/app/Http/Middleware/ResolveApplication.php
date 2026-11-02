<?php

namespace App\Http\Middleware;

use App\Models\Application;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveApplication
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = trim((string) $request->header('X-Application-Id'));
        if ($id === '') {
            abort(400, 'Header X-Application-Id wajib diisi.');
        }
        if (! preg_match('/^APP-\d{8}-\d{4}$/', $id)) {
            abort(400, 'Header X-Application-Id tidak valid.');
        }

        $token = $request->header('X-Application-Token') ?: abort(401, 'Header X-Application-Token wajib diisi.');
        $request->attributes->set('application', Application::findByToken($id, $token) ?? abort(404, 'Pengajuan tidak ditemukan.'));

        return $next($request);
    }
}
